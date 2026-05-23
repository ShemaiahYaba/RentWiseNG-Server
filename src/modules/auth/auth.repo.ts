import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { oauthAccounts, sessions, users } from '../../db/schema/index.js';

export type UserRecord = typeof users.$inferSelect;

export const authRepo = {
  async findByEmail(email: string): Promise<UserRecord | undefined> {
    const [row] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email.toLowerCase()), isNull(users.deletedAt)))
      .limit(1);
    return row;
  },

  async findByPhone(phone: string): Promise<UserRecord | undefined> {
    const [row] = await db
      .select()
      .from(users)
      .where(and(eq(users.phone, phone), isNull(users.deletedAt)))
      .limit(1);
    return row;
  },

  async findById(id: string): Promise<UserRecord | undefined> {
    const [row] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);
    return row;
  },

  async insertUser(data: typeof users.$inferInsert): Promise<UserRecord> {
    const [row] = await db.insert(users).values(data).returning();
    return row;
  },

  async updateUser(id: string, data: Partial<typeof users.$inferInsert>): Promise<UserRecord | undefined> {
    const [row] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return row;
  },

  async insertSession(data: typeof sessions.$inferInsert): Promise<typeof sessions.$inferSelect> {
    const [row] = await db.insert(sessions).values(data).returning();
    return row;
  },

  async findSessionById(id: string): Promise<typeof sessions.$inferSelect | undefined> {
    const [row] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    return row;
  },

  async findActiveSessionByRefreshHash(
    hash: string,
  ): Promise<typeof sessions.$inferSelect | undefined> {
    const [row] = await db
      .select()
      .from(sessions)
      .where(
        and(eq(sessions.refreshTokenHash, hash), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())),
      )
      .limit(1);
    return row;
  },

  async revokeSession(id: string): Promise<void> {
    await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, id));
  },

  async findOAuthAccount(
    provider: string,
    providerAccountId: string,
  ): Promise<typeof oauthAccounts.$inferSelect | undefined> {
    const [row] = await db
      .select()
      .from(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.provider, provider),
          eq(oauthAccounts.providerAccountId, providerAccountId),
          isNull(oauthAccounts.deletedAt),
        ),
      )
      .limit(1);
    return row;
  },

  async insertOAuthAccount(
    data: typeof oauthAccounts.$inferInsert,
  ): Promise<typeof oauthAccounts.$inferSelect> {
    const [row] = await db.insert(oauthAccounts).values(data).returning();
    return row;
  },
};
