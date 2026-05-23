import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  reporterId: uuid('reporter_id')
    .notNull()
    .references(() => users.id),
  targetType: varchar('target_type', { length: 32 }).notNull(),
  targetId: uuid('target_id').notNull(),
  reason: text('reason').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by'),
});

export const reportStatusLogs = pgTable('report_status_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id')
    .notNull()
    .references(() => reports.id),
  fromStatus: varchar('from_status', { length: 32 }).notNull(),
  toStatus: varchar('to_status', { length: 32 }).notNull(),
  actionedBy: uuid('actioned_by')
    .notNull()
    .references(() => users.id),
  note: text('note'),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
});

export const reportsRelations = relations(reports, ({ one, many }) => ({
  reporter: one(users, { fields: [reports.reporterId], references: [users.id] }),
  statusLogs: many(reportStatusLogs),
}));
