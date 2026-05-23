export const auditLogRepo = {
  async write(_entry: unknown): Promise<void> {
    // TODO: Phase 2
  },
  async listScoped(_userId: string, _role: string, _filters: unknown): Promise<unknown[]> {
    // TODO: Phase 2
    return [];
  },
};
