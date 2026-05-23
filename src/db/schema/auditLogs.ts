import { relations } from 'drizzle-orm';
import { jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id')
    .notNull()
    .references(() => users.id),
  actorRole: varchar('actor_role', { length: 32 }).notNull(),
  action: varchar('action', { length: 128 }).notNull(),
  entityType: varchar('entity_type', { length: 64 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  beforeState: jsonb('before_state'),
  afterState: jsonb('after_state').notNull(),
  ipAddress: varchar('ip_address', { length: 64 }),
  userAgent: varchar('user_agent', { length: 512 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const systemConfig = pgTable('system_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 128 }).notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  updatedBy: uuid('updated_by')
    .notNull()
    .references(() => users.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, { fields: [auditLogs.actorId], references: [users.id] }),
}));
