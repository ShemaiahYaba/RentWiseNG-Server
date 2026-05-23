import { relations } from 'drizzle-orm';
import { pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { listings } from './listings.js';
import { payments } from './payments.js';
import { users } from './users.js';

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  reviewerId: uuid('reviewer_id')
    .notNull()
    .references(() => users.id),
  listingId: uuid('listing_id')
    .notNull()
    .references(() => listings.id),
  paymentId: uuid('payment_id')
    .notNull()
    .references(() => payments.id),
  rating: smallint('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by'),
});

export const reviewsRelations = relations(reviews, ({ one }) => ({
  reviewer: one(users, { fields: [reviews.reviewerId], references: [users.id] }),
  listing: one(listings, { fields: [reviews.listingId], references: [listings.id] }),
  payment: one(payments, { fields: [reviews.paymentId], references: [payments.id] }),
}));
