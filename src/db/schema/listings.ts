import { relations } from 'drizzle-orm';
import {
  decimal,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  state: varchar('state', { length: 128 }).notNull(),
  city: varchar('city', { length: 128 }).notNull(),
  area: varchar('area', { length: 128 }).notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by'),
});

export const apartmentTypes = pgTable('apartment_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  label: varchar('label', { length: 64 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by'),
});

export const listings = pgTable('listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id),
  locationId: uuid('location_id')
    .notNull()
    .references(() => locations.id),
  apartmentTypeId: uuid('apartment_type_id')
    .notNull()
    .references(() => apartmentTypes.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  rentAmount: decimal('rent_amount', { precision: 12, scale: 2 }).notNull(),
  availabilityStatus: varchar('availability_status', { length: 32 }).notNull().default('available'),
  verificationStatus: varchar('verification_status', { length: 32 }).notNull().default('pending'),
  ownershipDocUrl: varchar('ownership_doc_url', { length: 1024 }).notNull(),
  videoUrl: varchar('video_url', { length: 1024 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by'),
});

export const listingPhotos = pgTable('listing_photos', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id')
    .notNull()
    .references(() => listings.id),
  photoUrl: varchar('photo_url', { length: 1024 }).notNull(),
  sortOrder: smallint('sort_order').notNull().default(0),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by'),
});

export const listingVerificationLogs = pgTable('listing_verification_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id')
    .notNull()
    .references(() => listings.id),
  fromStatus: varchar('from_status', { length: 32 }).notNull(),
  toStatus: varchar('to_status', { length: 32 }).notNull(),
  reviewedBy: uuid('reviewed_by')
    .notNull()
    .references(() => users.id),
  note: text('note'),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
});

export const listingsRelations = relations(listings, ({ one, many }) => ({
  owner: one(users, { fields: [listings.ownerId], references: [users.id] }),
  location: one(locations, { fields: [listings.locationId], references: [locations.id] }),
  apartmentType: one(apartmentTypes, {
    fields: [listings.apartmentTypeId],
    references: [apartmentTypes.id],
  }),
  photos: many(listingPhotos),
}));
