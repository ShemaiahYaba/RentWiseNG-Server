import { eq, isNull, and } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { kycSubmissions } from '@/db/schema/kyc.js';

export type KycRecord = typeof kycSubmissions.$inferSelect;

export type CreateKycInput = {
  userId: string;
  documentType: string;
  documentNumber: string;
  documentFrontUrl: string;
  documentBackUrl?: string;
  selfieUrl?: string;
};

export const kycRepo = {
  async findByUserId(_userId: string): Promise<KycRecord | undefined> {
    const [row] = await db
      .select()
      .from(kycSubmissions)
      .where(and(eq(kycSubmissions.userId, _userId), isNull(kycSubmissions.deletedAt)))
      .orderBy(kycSubmissions.submittedAt)
      .limit(1);

    return row;
  },
  async createSubmission(_data: typeof kycSubmissions.$inferInsert): Promise<KycRecord> {
    const [row] = await db.insert(kycSubmissions).values(_data).returning();
    return row;
  },
};
