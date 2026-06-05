import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { inspections, inspectionStatusLogs } from '@/db/schema/inspections.js';
import { listings } from '@/db/schema/listings.js';
import { users } from '@/db/schema/users.js';

export type InspectionRecord = typeof inspections.$inferSelect;

export type InspectionDetail = {
  id: string;
  tenantId: string;
  listingId: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  tenant: {
    id: string;
    fullName: string;
  };
  listing: {
    id: string;
    title: string;
    ownerId: string;
    rentAmount: string;
  };
};

export type CreateInspectionData = {
  tenantId: string;
  listingId: string;
  scheduledDate: string;
  scheduledTime: string;
};

const ACTIVE_STATUSES = ['pending', 'confirmed'] as const;

function mapInspectionRow(row: {
  inspection: typeof inspections.$inferSelect;
  tenant: { id: string; fullName: string };
  listing: { id: string; title: string; ownerId: string; rentAmount: string };
}): InspectionDetail {
  return {
    id: row.inspection.id,
    tenantId: row.inspection.tenantId,
    listingId: row.inspection.listingId,
    scheduledDate: row.inspection.scheduledDate,
    scheduledTime: row.inspection.scheduledTime,
    status: row.inspection.status,
    createdAt: row.inspection.createdAt,
    updatedAt: row.inspection.updatedAt,
    tenant: row.tenant,
    listing: row.listing,
  };
}

async function loadInspectionDetail(
  whereClause: ReturnType<typeof and>,
): Promise<InspectionDetail | undefined> {
  const [row] = await db
    .select({
      inspection: inspections,
      tenant: {
        id: users.id,
        fullName: users.fullName,
      },
      listing: {
        id: listings.id,
        title: listings.title,
        ownerId: listings.ownerId,
        rentAmount: listings.rentAmount,
      },
    })
    .from(inspections)
    .innerJoin(users, eq(inspections.tenantId, users.id))
    .innerJoin(listings, eq(inspections.listingId, listings.id))
    .where(whereClause)
    .limit(1);

  if (!row) {
    return undefined;
  }

  return mapInspectionRow(row);
}

export const inspectionRepo = {
  async create(data: CreateInspectionData): Promise<InspectionRecord> {
    const [row] = await db
      .insert(inspections)
      .values({
        tenantId: data.tenantId,
        listingId: data.listingId,
        scheduledDate: data.scheduledDate,
        scheduledTime: data.scheduledTime,
        status: 'pending',
      })
      .returning();
    return row;
  },

  async findById(id: string): Promise<InspectionDetail | undefined> {
    return loadInspectionDetail(and(eq(inspections.id, id), isNull(inspections.deletedAt)));
  },

  async listForUser(userId: string): Promise<InspectionDetail[]> {
    const rows = await db
      .select({
        inspection: inspections,
        tenant: {
          id: users.id,
          fullName: users.fullName,
        },
        listing: {
          id: listings.id,
          title: listings.title,
          ownerId: listings.ownerId,
          rentAmount: listings.rentAmount,
        },
      })
      .from(inspections)
      .innerJoin(users, eq(inspections.tenantId, users.id))
      .innerJoin(listings, eq(inspections.listingId, listings.id))
      .where(
        and(
          isNull(inspections.deletedAt),
          or(eq(inspections.tenantId, userId), eq(listings.ownerId, userId)),
        ),
      )
      .orderBy(desc(inspections.createdAt));

    return rows.map(mapInspectionRow);
  },

  async updateStatus(id: string, status: string): Promise<InspectionRecord | undefined> {
    const [row] = await db
      .update(inspections)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(inspections.id, id), isNull(inspections.deletedAt)))
      .returning();
    return row;
  },

  async createStatusLog(params: {
    inspectionId: string;
    fromStatus: string;
    toStatus: string;
    changedBy: string;
    note?: string;
  }): Promise<void> {
    await db.insert(inspectionStatusLogs).values({
      inspectionId: params.inspectionId,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      changedBy: params.changedBy,
      note: params.note,
    });
  },

  async findActiveForTenantListing(
    tenantId: string,
    listingId: string,
  ): Promise<InspectionRecord | undefined> {
    const [row] = await db
      .select()
      .from(inspections)
      .where(
        and(
          eq(inspections.tenantId, tenantId),
          eq(inspections.listingId, listingId),
          inArray(inspections.status, [...ACTIVE_STATUSES]),
          isNull(inspections.deletedAt),
        ),
      )
      .limit(1);
    return row;
  },
};
