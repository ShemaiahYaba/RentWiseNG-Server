import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { kycSubmissions } from '@/db/schema/kyc.js';

export type KycRecord = typeof kycSubmissions.$inferSelect;

export const kycRepo = {
  async findByUserId(_userId: string): Promise<KycRecord | undefined> {
    const [row] = await db
      .select()
      .from(kycSubmissions)
      .where(and(eq(kycSubmissions.userId, _userId), isNull(kycSubmissions.deletedAt)))
      .orderBy(desc(kycSubmissions.submittedAt))
      .limit(1);

    return row;
  },

  async createSubmission(_data: typeof kycSubmissions.$inferInsert): Promise<KycRecord> {
    const [row] = await db.insert(kycSubmissions).values(_data).returning();
    return row;
  },

  async softDeleteSubmission(id: string, deletedBy: string): Promise<void> {
    await db
      .update(kycSubmissions)
      .set({ deletedAt: new Date(), deletedBy })
      .where(eq(kycSubmissions.id, id));
  },

  async findById(id: string): Promise<KycRecord | undefined> {
    const [row] = await db
      .select()
      .from(kycSubmissions)
      .where(and(eq(kycSubmissions.id, id), isNull(kycSubmissions.deletedAt)))
      .limit(1);
    return row;
  },
};
