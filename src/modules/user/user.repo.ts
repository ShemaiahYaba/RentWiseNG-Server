import type { UserRecord } from '../auth/auth.repo.js';

export const userRepo = {
  async findById(_id: string): Promise<UserRecord | undefined> {
    // TODO: Phase 2 — implement user lookup
    return undefined;
  },

  async updateProfile(_id: string, _data: Record<string, unknown>): Promise<UserRecord | undefined> {
    // TODO: Phase 2 — implement profile update
    return undefined;
  },
};
