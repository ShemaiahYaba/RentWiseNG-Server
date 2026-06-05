import { getRequestIp, getRequestUserAgent } from '../context/requestContext.js';
import { auditLogRepo } from '../modules/auditLog/auditLog.repo.js';
import { logger } from './logger.js';

/**
 * Phase 2 contract — call from services after mutations to record audit trail.
 */
export interface AuditLogWriteInput {
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeState?: Record<string, unknown> | null;
  afterState: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function auditLogWrite(input: AuditLogWriteInput): Promise<void> {
  try {
    await auditLogRepo.write({
      ...input,
      ipAddress: input.ipAddress ?? getRequestIp(),
      userAgent: input.userAgent ?? getRequestUserAgent(),
    });
  } catch (err) {
    logger.error(
      { err, action: input.action, entityType: input.entityType, entityId: input.entityId },
      'audit log write failed',
    );
  }
}
