import { db } from '@/config/db.js';
import { listings } from '@/db/schema/listings.js';
import { reviews } from '@/db/schema/reviews.js';
import { users } from '@/db/schema/users.js';
import type { CreateReviewInput } from './review.schema.js';
import { and, desc, eq, isNull } from 'drizzle-orm';

export type ReviewRecord = typeof reviews.$inferSelect;

export type CreateReviewData = CreateReviewInput & { reviewerId: string };

export type ListingReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  reviewer: { id: string; fullName: string };
};

export const reviewRepo = {
  async create(data: CreateReviewData): Promise<ReviewRecord> {
    const [row] = await db
      .insert(reviews)
      .values({
        reviewerId: data.reviewerId,
        listingId: data.listingId,
        paymentId: data.paymentId,
        rating: data.rating,
        comment: data.comment ?? null,
      })
      .returning();
    return row;
  },

  async findByPaymentId(paymentId: string): Promise<ReviewRecord | undefined> {
    const [row] = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.paymentId, paymentId), isNull(reviews.deletedAt)))
      .limit(1);
    return row;
  },

  async listByListing(listingId: string): Promise<ListingReview[]> {
    const rows = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        reviewer: {
          id: users.id,
          fullName: users.fullName,
        },
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.reviewerId, users.id))
      .where(and(eq(reviews.listingId, listingId), isNull(reviews.deletedAt)))
      .orderBy(desc(reviews.createdAt));

    return rows;
  },

  async existsListing(listingId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: listings.id })
      .from(listings)
      .where(and(eq(listings.id, listingId), isNull(listings.deletedAt)))
      .limit(1);
    return Boolean(row);
  },
};
