import { relations } from 'drizzle-orm';
import { decimal, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { inspections } from './inspections.js';
import { listings } from './listings.js';
import { users } from './users.js';

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => users.id),
  listingId: uuid('listing_id')
    .notNull()
    .references(() => listings.id),
  inspectionId: uuid('inspection_id')
    .notNull()
    .references(() => inspections.id),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  paystackReference: varchar('paystack_reference', { length: 255 }).notNull().unique(),
  status: varchar('status', { length: 32 }).notNull().default('initiated'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by'),
});

export const paymentStatusLogs = pgTable('payment_status_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id')
    .notNull()
    .references(() => payments.id),
  fromStatus: varchar('from_status', { length: 32 }).notNull(),
  toStatus: varchar('to_status', { length: 32 }).notNull(),
  triggeredBy: uuid('triggered_by').references(() => users.id),
  triggerSource: varchar('trigger_source', { length: 32 }).notNull(),
  note: text('note'),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
});

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  tenant: one(users, { fields: [payments.tenantId], references: [users.id] }),
  listing: one(listings, { fields: [payments.listingId], references: [listings.id] }),
  inspection: one(inspections, { fields: [payments.inspectionId], references: [inspections.id] }),
  statusLogs: many(paymentStatusLogs),
}));
