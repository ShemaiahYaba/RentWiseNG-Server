import { reports } from '@/db/schema/reports.js';
import type { CreateReportInput } from './report.schema.js';
import { db } from '@/config/db.js';
import { and, eq, isNull } from 'drizzle-orm';

export type ReportRecord = typeof reports.$inferSelect;

export type CreateReportData = CreateReportInput & { reporterId: string };

export const reportRepo = {
  async create(_data: CreateReportData): Promise<ReportRecord> {
    const [row] = await db.insert(reports).values(_data).returning();
    return row;
  },
  async listByReporter(_reporterId: string): Promise<ReportRecord[]> {
    return db
      .select()
      .from(reports)
      .where(and(eq(reports.reporterId, _reporterId), isNull(reports.deletedAt)))
      .orderBy(reports.createdAt);
  },
  async findDuplicate(
    _reporterId: string,
    _targetId: string,
    _targetType: string,
  ): Promise<ReportRecord | undefined> {
    const [row] = await db
      .select()
      .from(reports)
      .where(
        and(
          eq(reports.reporterId, _reporterId),
          eq(reports.targetId, _targetId),
          eq(reports.targetType, _targetType),
          eq(reports.status, 'open'),
          isNull(reports.deletedAt),
        ),
      )
      .limit(1);

    return row;
  },
};
