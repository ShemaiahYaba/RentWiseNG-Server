import { and, eq, isNull } from 'drizzle-orm';
import { users } from '@/db/schema/users.js';
import type { UserRecord } from '../auth/auth.repo.js';
import { db } from '@/config/db.js';

export const userRepo = {
  async findById(_id: string): Promise<UserRecord | undefined> {
    const [row] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, _id), isNull(users.deletedAt)))
      .limit(1);
    return row;
  },

  async updateProfile(
    _id: string,
    _data: Partial<{ fullName: string; phone: string }>,
  ): Promise<UserRecord | undefined> {
    const [row] = await db
      .update(users)
      .set({ ..._data, updatedAt: new Date() })
      .where(and(eq(users.id, _id), isNull(users.deletedAt)))
      .returning();
    return row;
  },
};