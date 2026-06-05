import { auditLogRepo } from './auditLog.repo.js';
import type { AuditLogQuery } from './auditLog.types.js';

export const auditLogService = {
  async list(userId: string, role: string, query: AuditLogQuery) {
    return auditLogRepo.listScoped(userId, role, query);
  },

  async listAll(query: AuditLogQuery) {
    return auditLogRepo.listAll(query);
  },
};
