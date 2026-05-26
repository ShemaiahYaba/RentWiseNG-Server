import { AppError } from '../../lib/errors.js';
import { authRepo } from '../auth/auth.repo.js';
import { userRepo } from './user.repo.js';

export const userService = {
  async getMe(userId: string) {
    const user = await authRepo.findById(userId);
    if (!user) {
      throw new AppError('user not found', 404);
    }
    const { passwordHash: _, ...safe } = user;
    return safe;
  },

  async updateMe(_userId: string, _data: Partial<{ fullName: string; phone: string }>) {
    const existing = await authRepo.findById(_userId);
    if (!existing) {
      throw new AppError('user not found', 404);
    }

    const update: Partial<{ fullName: string; phone: string; phoneVerified: boolean }> = {
      ..._data,
    };

    if (_data.phone && _data.phone !== existing.phone) {
      const phoneOwner = await authRepo.findByPhone(_data.phone);
      if (phoneOwner && phoneOwner.id !== _userId) {
        throw new AppError('phone already in use', 409);
      }
      update.phoneVerified = false;
    }

    const updated = await userRepo.updateProfile(_userId, update);
    if (!updated) {
      throw new AppError('update failed', 500);
    }

    const { passwordHash: _, ...safe } = updated;
    return safe;
  },
};
