import { auditLogWrite } from '@/lib/auditLogWrite.js';
import { AppError } from '@/lib/errors.js';
import { getConfigNumber } from '@/lib/systemConfig.js';
import { listingRepo } from '@/modules/listings/listing.repo.js';
import type { InspectionDetail } from './inspection.repo.js';
import { inspectionRepo } from './inspection.repo.js';
import type { BookInspectionInput } from './inspection.schema.js';

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
};

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function assertCanView(userId: string, role: string, inspection: InspectionDetail): void {
  const isTenant = inspection.tenantId === userId;
  const isOwner = inspection.listing.ownerId === userId;
  const isAdmin = role === 'admin';

  if (!isTenant && !isOwner && !isAdmin) {
    throw new AppError('inspection not found', 404);
  }
}

export const inspectionService = {
  async book(tenantId: string, data: BookInspectionInput) {
    const listing = await listingRepo.findById(data.listingId);
    if (!listing || listing.verificationStatus !== 'verified') {
      throw new AppError('listing not found', 404);
    }

    const advanceDays = await getConfigNumber('inspection_advance_booking_days');
    const minDate = addDays(utcToday(), advanceDays);
    if (data.scheduledDate < minDate) {
      throw new AppError(
        `inspection must be scheduled at least ${advanceDays} days in advance`,
        422,
      );
    }

    const active = await inspectionRepo.findActiveForTenantListing(tenantId, data.listingId);
    if (active) {
      throw new AppError('active inspection already exists for this listing', 409);
    }

    const created = await inspectionRepo.create({
      tenantId,
      listingId: data.listingId,
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime,
    });

    await inspectionRepo.createStatusLog({
      inspectionId: created.id,
      fromStatus: 'none',
      toStatus: 'pending',
      changedBy: tenantId,
    });

    const inspection = await inspectionRepo.findById(created.id);
    if (!inspection) {
      throw new AppError('failed to load created inspection', 500);
    }

    await auditLogWrite({
      actorId: tenantId,
      actorRole: 'tenant',
      action: 'inspection.booked',
      entityType: 'inspection',
      entityId: inspection.id,
      beforeState: null,
      afterState: {
        id: inspection.id,
        listingId: inspection.listingId,
        status: inspection.status,
        scheduledDate: inspection.scheduledDate,
      },
    });

    return { inspection };
  },

  async getById(userId: string, role: string, id: string) {
    const inspection = await inspectionRepo.findById(id);
    if (!inspection) {
      throw new AppError('inspection not found', 404);
    }

    assertCanView(userId, role, inspection);
    return { inspection };
  },

  async updateStatus(userId: string, role: string, id: string, status: string) {
    const inspection = await inspectionRepo.findById(id);
    if (!inspection) {
      throw new AppError('inspection not found', 404);
    }

    if (inspection.listing.ownerId !== userId) {
      throw new AppError('only the listing owner can update inspection status', 403);
    }

    const allowed = STATUS_TRANSITIONS[inspection.status];
    if (!allowed?.includes(status)) {
      throw new AppError('invalid status transition', 422);
    }

    await inspectionRepo.updateStatus(id, status);
    await inspectionRepo.createStatusLog({
      inspectionId: id,
      fromStatus: inspection.status,
      toStatus: status,
      changedBy: userId,
    });

    const updated = await inspectionRepo.findById(id);
    if (!updated) {
      throw new AppError('failed to load updated inspection', 500);
    }

    await auditLogWrite({
      actorId: userId,
      actorRole: role,
      action: 'inspection.status_changed',
      entityType: 'inspection',
      entityId: id,
      beforeState: {
        id: inspection.id,
        status: inspection.status,
      },
      afterState: {
        id: updated.id,
        status: updated.status,
      },
    });

    return { inspection: updated };
  },

  async listMine(userId: string) {
    const inspections = await inspectionRepo.listForUser(userId);
    return { inspections };
  },
};
