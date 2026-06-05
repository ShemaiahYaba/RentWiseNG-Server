import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { inspections } from '@/db/schema/inspections.js';
import { listings } from '@/db/schema/listings.js';
import { paymentStatusLogs, payments } from '@/db/schema/payments.js';
import { users } from '@/db/schema/users.js';

export type PaymentRecord = typeof payments.$inferSelect;

export type PaymentDetail = {
  id: string;
  tenantId: string;
  listingId: string;
  inspectionId: string;
  amount: string;
  paystackReference: string;
  status: string;
  createdAt: Date;
  releasedAt: Date | null;
  tenant: { id: string; fullName: string; email: string };
  listing: { id: string; title: string; ownerId: string; rentAmount: string };
  inspection: { id: string; status: string };
};

export type CreatePaymentData = {
  tenantId: string;
  listingId: string;
  inspectionId: string;
  amount: string;
  paystackReference: string;
};

const ACTIVE_STATUSES = ['initiated', 'processing', 'held'] as const;

function mapPaymentRow(row: {
  payment: typeof payments.$inferSelect;
  tenant: { id: string; fullName: string; email: string };
  listing: { id: string; title: string; ownerId: string; rentAmount: string };
  inspection: { id: string; status: string };
}): PaymentDetail {
  return {
    id: row.payment.id,
    tenantId: row.payment.tenantId,
    listingId: row.payment.listingId,
    inspectionId: row.payment.inspectionId,
    amount: row.payment.amount,
    paystackReference: row.payment.paystackReference,
    status: row.payment.status,
    createdAt: row.payment.createdAt,
    releasedAt: row.payment.releasedAt,
    tenant: row.tenant,
    listing: row.listing,
    inspection: row.inspection,
  };
}

async function loadPaymentDetail(
  whereClause: ReturnType<typeof and>,
): Promise<PaymentDetail | undefined> {
  const [row] = await db
    .select({
      payment: payments,
      tenant: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      },
      listing: {
        id: listings.id,
        title: listings.title,
        ownerId: listings.ownerId,
        rentAmount: listings.rentAmount,
      },
      inspection: {
        id: inspections.id,
        status: inspections.status,
      },
    })
    .from(payments)
    .innerJoin(users, eq(payments.tenantId, users.id))
    .innerJoin(listings, eq(payments.listingId, listings.id))
    .innerJoin(inspections, eq(payments.inspectionId, inspections.id))
    .where(whereClause)
    .limit(1);

  if (!row) {
    return undefined;
  }

  return mapPaymentRow(row);
}

export const paymentRepo = {
  async create(data: CreatePaymentData): Promise<PaymentRecord> {
    const [row] = await db
      .insert(payments)
      .values({
        tenantId: data.tenantId,
        listingId: data.listingId,
        inspectionId: data.inspectionId,
        amount: data.amount,
        paystackReference: data.paystackReference,
        status: 'initiated',
      })
      .returning();
    return row;
  },

  async findById(id: string): Promise<PaymentDetail | undefined> {
    return loadPaymentDetail(and(eq(payments.id, id), isNull(payments.deletedAt)));
  },

  async findByReference(reference: string): Promise<PaymentDetail | undefined> {
    return loadPaymentDetail(
      and(eq(payments.paystackReference, reference), isNull(payments.deletedAt)),
    );
  },

  async listForUser(userId: string): Promise<PaymentDetail[]> {
    const rows = await db
      .select({
        payment: payments,
        tenant: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
        },
        listing: {
          id: listings.id,
          title: listings.title,
          ownerId: listings.ownerId,
          rentAmount: listings.rentAmount,
        },
        inspection: {
          id: inspections.id,
          status: inspections.status,
        },
      })
      .from(payments)
      .innerJoin(users, eq(payments.tenantId, users.id))
      .innerJoin(listings, eq(payments.listingId, listings.id))
      .innerJoin(inspections, eq(payments.inspectionId, inspections.id))
      .where(
        and(
          isNull(payments.deletedAt),
          or(eq(payments.tenantId, userId), eq(listings.ownerId, userId)),
        ),
      )
      .orderBy(desc(payments.createdAt));

    return rows.map(mapPaymentRow);
  },

  async findActiveForInspection(inspectionId: string): Promise<PaymentRecord | undefined> {
    const [row] = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.inspectionId, inspectionId),
          inArray(payments.status, [...ACTIVE_STATUSES]),
          isNull(payments.deletedAt),
        ),
      )
      .limit(1);
    return row;
  },

  async updateStatus(
    id: string,
    status: string,
    extra?: { releasedAt?: Date },
  ): Promise<PaymentRecord | undefined> {
    const [row] = await db
      .update(payments)
      .set({
        status,
        ...(extra?.releasedAt ? { releasedAt: extra.releasedAt } : {}),
      })
      .where(and(eq(payments.id, id), isNull(payments.deletedAt)))
      .returning();
    return row;
  },

  async createStatusLog(params: {
    paymentId: string;
    fromStatus: string;
    toStatus: string;
    triggeredBy?: string;
    triggerSource: 'user' | 'webhook' | 'system';
    note?: string;
  }): Promise<void> {
    await db.insert(paymentStatusLogs).values({
      paymentId: params.paymentId,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      triggeredBy: params.triggeredBy ?? null,
      triggerSource: params.triggerSource,
      note: params.note,
    });
  },
};
