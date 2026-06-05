import { randomUUID } from 'crypto';
import { auditLogWrite } from '@/lib/auditLogWrite.js';
import { AppError } from '@/lib/errors.js';
import { initializeTransaction, verifyWebhookSignature } from '@/config/paystack.js';
import { env } from '@/config/env.js';
import { authRepo } from '@/modules/auth/auth.repo.js';
import { inspectionRepo } from '@/modules/inspections/inspection.repo.js';
import { listingRepo } from '@/modules/listings/listing.repo.js';
import type { InitiatePaymentInput } from './payment.schema.js';
import { paymentRepo } from './payment.repo.js';

const WEBHOOK_SUCCESS_EVENTS = new Set(['charge.success', 'transfer.success']);
const WEBHOOK_FAIL_EVENTS = new Set(['charge.failed']);

function normalizeAmount(value: string): string {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new AppError('invalid amount', 422);
  }
  return parsed.toFixed(2);
}

function amountsMatch(expected: string, actual: string): boolean {
  return normalizeAmount(expected) === normalizeAmount(actual);
}

function amountToKobo(amount: string): number {
  return Math.round(Number(normalizeAmount(amount)) * 100);
}

function assertCanView(userId: string, role: string, payment: Awaited<ReturnType<typeof paymentRepo.findById>>) {
  if (!payment) {
    throw new AppError('payment not found', 404);
  }
  const isTenant = payment.tenantId === userId;
  const isOwner = payment.listing.ownerId === userId;
  const isAdmin = role === 'admin';
  if (!isTenant && !isOwner && !isAdmin) {
    throw new AppError('payment not found', 404);
  }
}

async function transitionStatus(
  paymentId: string,
  fromStatus: string,
  toStatus: string,
  opts: {
    triggeredBy?: string;
    triggerSource: 'user' | 'webhook' | 'system';
    note?: string;
    releasedAt?: Date;
  },
) {
  await paymentRepo.updateStatus(paymentId, toStatus, {
    releasedAt: opts.releasedAt,
  });
  await paymentRepo.createStatusLog({
    paymentId,
    fromStatus,
    toStatus,
    triggeredBy: opts.triggeredBy,
    triggerSource: opts.triggerSource,
    note: opts.note,
  });
}

export const paymentService = {
  async initiate(tenantId: string, data: InitiatePaymentInput) {
    const inspection = await inspectionRepo.findById(data.inspectionId);
    if (!inspection) {
      throw new AppError('inspection not found', 404);
    }
    if (inspection.tenantId !== tenantId) {
      throw new AppError('only the tenant who booked the inspection can initiate payment', 403);
    }
    if (inspection.status !== 'completed') {
      throw new AppError('inspection must be completed before payment', 422);
    }

    const listing = await listingRepo.findById(inspection.listingId);
    if (!listing) {
      throw new AppError('listing not found', 404);
    }

    if (!amountsMatch(listing.rentAmount, data.amount)) {
      throw new AppError('amount must match listing rent amount', 422);
    }

    const active = await paymentRepo.findActiveForInspection(data.inspectionId);
    if (active) {
      throw new AppError('active payment already exists for this inspection', 409);
    }

    const tenant = await authRepo.findById(tenantId);
    if (!tenant?.email) {
      throw new AppError('tenant email required for payment', 422);
    }

    const paystackReference = `rw_${randomUUID()}`;
    const amount = normalizeAmount(data.amount);

    const created = await paymentRepo.create({
      tenantId,
      listingId: inspection.listingId,
      inspectionId: data.inspectionId,
      amount,
      paystackReference,
    });

    await paymentRepo.createStatusLog({
      paymentId: created.id,
      fromStatus: 'none',
      toStatus: 'initiated',
      triggeredBy: tenantId,
      triggerSource: 'user',
    });

    const paystack = await initializeTransaction({
      email: tenant.email,
      amountKobo: amountToKobo(amount),
      reference: paystackReference,
      callbackUrl: `${env.APP_URL}/api/v1/payments/callback`,
    });

    const payment = await paymentRepo.findById(created.id);
    if (!payment) {
      throw new AppError('failed to load created payment', 500);
    }

    await auditLogWrite({
      actorId: tenantId,
      actorRole: 'tenant',
      action: 'payment.initiated',
      entityType: 'payment',
      entityId: payment.id,
      beforeState: null,
      afterState: {
        id: payment.id,
        status: payment.status,
        inspectionId: payment.inspectionId,
        amount: payment.amount,
      },
    });

    return { payment, authorizationUrl: paystack.authorizationUrl };
  },

  async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
      throw new AppError('invalid webhook signature', 401);
    }

    let payload: { event?: string; data?: { reference?: string } };
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as typeof payload;
    } catch {
      throw new AppError('invalid webhook payload', 400);
    }

    const reference = payload.data?.reference;
    if (!reference) {
      return { received: true, ignored: true };
    }

    const payment = await paymentRepo.findByReference(reference);
    if (!payment) {
      return { received: true, ignored: true };
    }

    const event = payload.event ?? '';

    if (WEBHOOK_SUCCESS_EVENTS.has(event)) {
      if (payment.status === 'held' || payment.status === 'released') {
        return { received: true, paymentId: payment.id, status: payment.status };
      }

      const initialStatus = payment.status;

      if (payment.status === 'initiated') {
        await transitionStatus(payment.id, 'initiated', 'processing', {
          triggerSource: 'webhook',
          note: event,
        });
        const updated = await paymentRepo.findById(payment.id);
        if (updated) {
          await transitionStatus(updated.id, 'processing', 'held', {
            triggerSource: 'webhook',
            note: event,
          });
        }
      } else if (payment.status === 'processing') {
        await transitionStatus(payment.id, 'processing', 'held', {
          triggerSource: 'webhook',
          note: event,
        });
      }

      const finalPayment = await paymentRepo.findById(payment.id);
      if (finalPayment && finalPayment.status !== initialStatus) {
        await auditLogWrite({
          actorId: payment.tenantId,
          actorRole: 'system',
          action: 'payment.status_changed',
          entityType: 'payment',
          entityId: payment.id,
          beforeState: { id: payment.id, status: initialStatus },
          afterState: { id: payment.id, status: finalPayment.status, event },
        });
      }
      return { received: true, paymentId: payment.id, status: finalPayment?.status };
    }

    if (WEBHOOK_FAIL_EVENTS.has(event)) {
      if (payment.status === 'failed' || payment.status === 'released') {
        return { received: true, paymentId: payment.id, status: payment.status };
      }
      const initialStatus = payment.status;
      await transitionStatus(payment.id, payment.status, 'failed', {
        triggerSource: 'webhook',
        note: event,
      });
      await auditLogWrite({
        actorId: payment.tenantId,
        actorRole: 'system',
        action: 'payment.status_changed',
        entityType: 'payment',
        entityId: payment.id,
        beforeState: { id: payment.id, status: initialStatus },
        afterState: { id: payment.id, status: 'failed', event },
      });
      return { received: true, paymentId: payment.id, status: 'failed' };
    }

    return { received: true, ignored: true };
  },

  async release(tenantId: string, paymentId: string) {
    const payment = await paymentRepo.findById(paymentId);
    if (!payment) {
      throw new AppError('payment not found', 404);
    }
    if (payment.tenantId !== tenantId) {
      throw new AppError('only the tenant can release this payment', 403);
    }
    if (payment.status !== 'held') {
      throw new AppError('payment must be in held status to release', 422);
    }

    const now = new Date();
    await transitionStatus(payment.id, 'held', 'released', {
      triggeredBy: tenantId,
      triggerSource: 'user',
      releasedAt: now,
    });

    const updated = await paymentRepo.findById(paymentId);
    if (!updated) {
      throw new AppError('failed to load updated payment', 500);
    }

    await auditLogWrite({
      actorId: tenantId,
      actorRole: 'tenant',
      action: 'payment.released',
      entityType: 'payment',
      entityId: paymentId,
      beforeState: { id: payment.id, status: 'held' },
      afterState: { id: updated.id, status: updated.status },
    });

    return { payment: updated };
  },

  async getById(userId: string, role: string, id: string) {
    const payment = await paymentRepo.findById(id);
    assertCanView(userId, role, payment);
    return { payment };
  },

  async listMine(userId: string) {
    const payments = await paymentRepo.listForUser(userId);
    return { payments };
  },
};
