import { relations } from 'drizzle-orm';
import { date, pgTable, text, time, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { listings } from './listings.js';
import { users } from './users.js';

export const inspections = pgTable('inspections', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => users.id),
  listingId: uuid('listing_id')
    .notNull()
    .references(() => listings.id),
  scheduledDate: date('scheduled_date').notNull(),
  scheduledTime: time('scheduled_time').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by'),
});

export const inspectionStatusLogs = pgTable('inspection_status_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  inspectionId: uuid('inspection_id')
    .notNull()
    .references(() => inspections.id),
  fromStatus: varchar('from_status', { length: 32 }).notNull(),
  toStatus: varchar('to_status', { length: 32 }).notNull(),
  changedBy: uuid('changed_by')
    .notNull()
    .references(() => users.id),
  note: text('note'),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
});

export const inspectionsRelations = relations(inspections, ({ one, many }) => ({
  tenant: one(users, { fields: [inspections.tenantId], references: [users.id] }),
  listing: one(listings, { fields: [inspections.listingId], references: [listings.id] }),
  statusLogs: many(inspectionStatusLogs),
}));
