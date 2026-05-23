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

export async function auditLogWrite(_input: AuditLogWriteInput): Promise<void> {
  // TODO: Phase 2 — persist via auditLogRepo.write()
}
