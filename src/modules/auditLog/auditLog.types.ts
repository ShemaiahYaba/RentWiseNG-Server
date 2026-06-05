import type { z } from 'zod';
import type { auditLogQuerySchema } from './auditLog.schema.js';

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

export interface AuditLogRow {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface AuditLogListResult {
  auditLogs: AuditLogRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
