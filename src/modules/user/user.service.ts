import { AppError } from '../../lib/errors.js';
import { notImplemented } from '../../lib/notImplemented.js';
import { authRepo } from '../auth/auth.repo.js';

export const userService = {
  async getMe(userId: string) {
    const user = await authRepo.findById(userId);
    if (!user) {
      throw new AppError('user not found', 404);
    }
    const { passwordHash: _, ...safe } = user;
    return safe;
  },

  async updateMe(_userId: string, _data: Record<string, unknown>) {
    // TODO: Phase 2
    notImplemented('user.updateMe');
  },
};
