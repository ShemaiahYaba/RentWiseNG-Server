import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  or,
  type SQL,
} from 'drizzle-orm';
import { db } from '@/config/db.js';
import { auditLogs } from '@/db/schema/auditLogs.js';
import { inspections } from '@/db/schema/inspections.js';
import { listings } from '@/db/schema/listings.js';
import { payments } from '@/db/schema/payments.js';
import type { AuditLogWriteInput } from '@/lib/auditLogWrite.js';
import type { AuditLogListResult, AuditLogQuery, AuditLogRow } from './auditLog.types.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

function resolvePagination(query: AuditLogQuery) {
  const page = query.page ?? DEFAULT_PAGE;
  const limit = query.limit ?? DEFAULT_LIMIT;
  return { page, limit, offset: (page - 1) * limit };
}

function buildFilterConditions(filters: AuditLogQuery): SQL[] {
  const conditions: SQL[] = [];
  if (filters.entityType) {
    conditions.push(eq(auditLogs.entityType, filters.entityType));
  }
  if (filters.entityId) {
    conditions.push(eq(auditLogs.entityId, filters.entityId));
  }
  if (filters.action) {
    conditions.push(eq(auditLogs.action, filters.action));
  }
  if (filters.from) {
    conditions.push(gte(auditLogs.createdAt, new Date(filters.from)));
  }
  if (filters.to) {
    conditions.push(lte(auditLogs.createdAt, new Date(filters.to)));
  }
  return conditions;
}

async function getAccessibleEntityIds(
  userId: string,
  role: string,
): Promise<{ listingIds: string[]; inspectionIds: string[]; paymentIds: string[] }> {
  if (role === 'tenant') {
    const inspectionRows = await db
      .select({ id: inspections.id })
      .from(inspections)
      .where(and(eq(inspections.tenantId, userId), isNull(inspections.deletedAt)));

    const paymentRows = await db
      .select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.tenantId, userId), isNull(payments.deletedAt)));

    return {
      listingIds: [],
      inspectionIds: inspectionRows.map((r) => r.id),
      paymentIds: paymentRows.map((r) => r.id),
    };
  }

  if (role === 'agent' || role === 'landlord') {
    const listingRows = await db
      .select({ id: listings.id })
      .from(listings)
      .where(and(eq(listings.ownerId, userId), isNull(listings.deletedAt)));

    const listingIds = listingRows.map((r) => r.id);
    if (listingIds.length === 0) {
      return { listingIds: [], inspectionIds: [], paymentIds: [] };
    }

    const inspectionRows = await db
      .select({ id: inspections.id })
      .from(inspections)
      .where(and(inArray(inspections.listingId, listingIds), isNull(inspections.deletedAt)));

    const paymentRows = await db
      .select({ id: payments.id })
      .from(payments)
      .where(and(inArray(payments.listingId, listingIds), isNull(payments.deletedAt)));

    return {
      listingIds,
      inspectionIds: inspectionRows.map((r) => r.id),
      paymentIds: paymentRows.map((r) => r.id),
    };
  }

  return { listingIds: [], inspectionIds: [], paymentIds: [] };
}

function buildScopeCondition(
  userId: string,
  accessible: { listingIds: string[]; inspectionIds: string[]; paymentIds: string[] },
): SQL {
  const conditions: SQL[] = [eq(auditLogs.actorId, userId)];

  if (accessible.listingIds.length > 0) {
    conditions.push(
      and(
        eq(auditLogs.entityType, 'listing'),
        inArray(auditLogs.entityId, accessible.listingIds),
      )!,
    );
  }
  if (accessible.inspectionIds.length > 0) {
    conditions.push(
      and(
        eq(auditLogs.entityType, 'inspection'),
        inArray(auditLogs.entityId, accessible.inspectionIds),
      )!,
    );
  }
  if (accessible.paymentIds.length > 0) {
    conditions.push(
      and(
        eq(auditLogs.entityType, 'payment'),
        inArray(auditLogs.entityId, accessible.paymentIds),
      )!,
    );
  }

  return or(...conditions)!;
}

function mapRow(row: typeof auditLogs.$inferSelect): AuditLogRow {
  return {
    id: row.id,
    actorId: row.actorId,
    actorRole: row.actorRole,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    beforeState: (row.beforeState as Record<string, unknown> | null) ?? null,
    afterState: row.afterState as Record<string, unknown>,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
  };
}

export const auditLogRepo = {
  async write(entry: AuditLogWriteInput): Promise<void> {
    await db.insert(auditLogs).values({
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      beforeState: entry.beforeState ?? null,
      afterState: entry.afterState,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
    });
  },

  async countScoped(userId: string, role: string, filters: AuditLogQuery): Promise<number> {
    const accessible = await getAccessibleEntityIds(userId, role);
    const scopeCondition = buildScopeCondition(userId, accessible);
    const filterConditions = buildFilterConditions(filters);
    const whereClause =
      filterConditions.length > 0
        ? and(scopeCondition, ...filterConditions)
        : scopeCondition;

    const [row] = await db.select({ total: count() }).from(auditLogs).where(whereClause);
    return Number(row?.total ?? 0);
  },

  async listScoped(
    userId: string,
    role: string,
    filters: AuditLogQuery,
  ): Promise<AuditLogListResult> {
    const { page, limit, offset } = resolvePagination(filters);
    const accessible = await getAccessibleEntityIds(userId, role);
    const scopeCondition = buildScopeCondition(userId, accessible);
    const filterConditions = buildFilterConditions(filters);
    const whereClause =
      filterConditions.length > 0
        ? and(scopeCondition, ...filterConditions)
        : scopeCondition;

    const [totalRow] = await db.select({ total: count() }).from(auditLogs).where(whereClause);
    const total = Number(totalRow?.total ?? 0);

    const rows = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      auditLogs: rows.map(mapRow),
      pagination: { page, limit, total },
    };
  },

  async countAll(filters: AuditLogQuery): Promise<number> {
    const filterConditions = buildFilterConditions(filters);
    const whereClause =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const [row] = await db
      .select({ total: count() })
      .from(auditLogs)
      .where(whereClause);
    return Number(row?.total ?? 0);
  },

  async listAll(filters: AuditLogQuery): Promise<AuditLogListResult> {
    const { page, limit, offset } = resolvePagination(filters);
    const filterConditions = buildFilterConditions(filters);
    const whereClause =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const [totalRow] = await db
      .select({ total: count() })
      .from(auditLogs)
      .where(whereClause);
    const total = Number(totalRow?.total ?? 0);

    const rows = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      auditLogs: rows.map(mapRow),
      pagination: { page, limit, total },
    };
  },
};
