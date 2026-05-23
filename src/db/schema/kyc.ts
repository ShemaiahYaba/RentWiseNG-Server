import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const kycSubmissions = pgTable('kyc_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  documentType: varchar('document_type', { length: 32 }).notNull(),
  documentNumber: varchar('document_number', { length: 512 }).notNull(),
  documentFrontUrl: varchar('document_front_url', { length: 1024 }).notNull(),
  documentBackUrl: varchar('document_back_url', { length: 1024 }),
  selfieUrl: varchar('selfie_url', { length: 1024 }),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  rejectionReason: text('rejection_reason'),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by'),
});

export const kycStatusLogs = pgTable('kyc_status_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  kycId: uuid('kyc_id')
    .notNull()
    .references(() => kycSubmissions.id),
  fromStatus: varchar('from_status', { length: 32 }).notNull(),
  toStatus: varchar('to_status', { length: 32 }).notNull(),
  changedBy: uuid('changed_by')
    .notNull()
    .references(() => users.id),
  note: text('note'),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
});

export const kycSubmissionsRelations = relations(kycSubmissions, ({ one, many }) => ({
  user: one(users, { fields: [kycSubmissions.userId], references: [users.id] }),
  statusLogs: many(kycStatusLogs),
}));
