import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  isNull,
  lte,
  type SQL,
} from 'drizzle-orm';
import { db } from '@/config/db.js';
import {
  apartmentTypes,
  listingPhotos,
  listings,
  locations,
} from '@/db/schema/listings.js';
import type {
  CreateListingData,
  ListingDetail,
  ListingSearchResult,
  UpdateListingData,
} from './listing.types.js';
import type { ListingSearchInput } from './listing.schema.js';

function activePhotosCondition() {
  return isNull(listingPhotos.deletedAt);
}

async function loadPhotosForListing(listingId: string) {
  return db
    .select({
      id: listingPhotos.id,
      photoUrl: listingPhotos.photoUrl,
      sortOrder: listingPhotos.sortOrder,
    })
    .from(listingPhotos)
    .where(and(eq(listingPhotos.listingId, listingId), activePhotosCondition()))
    .orderBy(asc(listingPhotos.sortOrder));
}

async function mapListingRow(
  row: typeof listings.$inferSelect & {
    location: typeof locations.$inferSelect;
    apartmentType: typeof apartmentTypes.$inferSelect;
  },
): Promise<ListingDetail> {
  const photos = await loadPhotosForListing(row.id);
  return {
    ...row,
    location: {
      id: row.location.id,
      state: row.location.state,
      city: row.location.city,
      area: row.location.area,
      latitude: row.location.latitude,
      longitude: row.location.longitude,
    },
    apartmentType: {
      id: row.apartmentType.id,
      label: row.apartmentType.label,
    },
    photos,
  };
}

function searchConditions(filters: ListingSearchInput, verifiedOnly: boolean): SQL[] {
  const conditions: SQL[] = [isNull(listings.deletedAt)];

  if (verifiedOnly) {
    conditions.push(eq(listings.verificationStatus, 'verified'));
  }

  if (filters.city) {
    conditions.push(eq(locations.city, filters.city));
  }
  if (filters.state) {
    conditions.push(eq(locations.state, filters.state));
  }
  if (filters.apartmentTypeId) {
    conditions.push(eq(listings.apartmentTypeId, filters.apartmentTypeId));
  }
  if (filters.minRent) {
    conditions.push(gte(listings.rentAmount, filters.minRent));
  }
  if (filters.maxRent) {
    conditions.push(lte(listings.rentAmount, filters.maxRent));
  }

  return conditions;
}

export const listingRepo = {
  async existsLocation(locationId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: locations.id })
      .from(locations)
      .where(and(eq(locations.id, locationId), isNull(locations.deletedAt)))
      .limit(1);
    return Boolean(row);
  },

  async existsApartmentType(apartmentTypeId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: apartmentTypes.id })
      .from(apartmentTypes)
      .where(and(eq(apartmentTypes.id, apartmentTypeId), isNull(apartmentTypes.deletedAt)))
      .limit(1);
    return Boolean(row);
  },

  async countActiveByOwner(ownerId: string): Promise<number> {
    const [row] = await db
      .select({ total: count() })
      .from(listings)
      .where(and(eq(listings.ownerId, ownerId), isNull(listings.deletedAt)));
    return Number(row?.total ?? 0);
  },

  async searchPublic(filters: ListingSearchInput): Promise<ListingSearchResult> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;
    const whereClause = and(...searchConditions(filters, true));

    const [totalRow] = await db
      .select({ total: count() })
      .from(listings)
      .innerJoin(locations, eq(listings.locationId, locations.id))
      .where(whereClause);

    const total = Number(totalRow?.total ?? 0);

    const rows = await db
      .select({
        listing: listings,
        location: locations,
        apartmentType: apartmentTypes,
      })
      .from(listings)
      .innerJoin(locations, eq(listings.locationId, locations.id))
      .innerJoin(apartmentTypes, eq(listings.apartmentTypeId, apartmentTypes.id))
      .where(whereClause)
      .orderBy(desc(listings.createdAt))
      .limit(limit)
      .offset(offset);

    const listingsResult: ListingDetail[] = [];
    for (const row of rows) {
      listingsResult.push(
        await mapListingRow({
          ...row.listing,
          location: row.location,
          apartmentType: row.apartmentType,
        }),
      );
    }

    return {
      listings: listingsResult,
      pagination: {
        page,
        limit,
        total,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  },

  async findById(id: string): Promise<ListingDetail | undefined> {
    const [row] = await db
      .select({
        listing: listings,
        location: locations,
        apartmentType: apartmentTypes,
      })
      .from(listings)
      .innerJoin(locations, eq(listings.locationId, locations.id))
      .innerJoin(apartmentTypes, eq(listings.apartmentTypeId, apartmentTypes.id))
      .where(and(eq(listings.id, id), isNull(listings.deletedAt)))
      .limit(1);

    if (!row) {
      return undefined;
    }

    return mapListingRow({
      ...row.listing,
      location: row.location,
      apartmentType: row.apartmentType,
    });
  },

  async create(data: CreateListingData): Promise<ListingDetail> {
    const [listing] = await db
      .insert(listings)
      .values({
        ownerId: data.ownerId,
        locationId: data.locationId,
        apartmentTypeId: data.apartmentTypeId,
        title: data.title,
        description: data.description,
        rentAmount: data.rentAmount,
        ownershipDocUrl: data.ownershipDocUrl,
        videoUrl: data.videoUrl,
        verificationStatus: 'pending',
        availabilityStatus: 'available',
      })
      .returning();

    if (data.photoUrls.length > 0) {
      await db.insert(listingPhotos).values(
        data.photoUrls.map((photoUrl, index) => ({
          listingId: listing.id,
          photoUrl,
          sortOrder: index,
        })),
      );
    }

    const detail = await this.findById(listing.id);
    if (!detail) {
      throw new Error('failed to load created listing');
    }
    return detail;
  },

  async update(
    id: string,
    ownerId: string,
    data: UpdateListingData,
  ): Promise<ListingDetail | undefined> {
    const existing = await this.findById(id);
    if (!existing || existing.ownerId !== ownerId) {
      return undefined;
    }

    const { photoUrls, ...listingFields } = data;
    const patch: Partial<typeof listings.$inferInsert> = {
      ...listingFields,
      updatedAt: new Date(),
    };

    if (Object.keys(listingFields).length > 0) {
      await db.update(listings).set(patch).where(eq(listings.id, id));
    }

    if (photoUrls !== undefined) {
      await db
        .update(listingPhotos)
        .set({ deletedAt: new Date(), deletedBy: ownerId })
        .where(and(eq(listingPhotos.listingId, id), activePhotosCondition()));

      if (photoUrls.length > 0) {
        await db.insert(listingPhotos).values(
          photoUrls.map((photoUrl, index) => ({
            listingId: id,
            photoUrl,
            sortOrder: index,
          })),
        );
      }
    }

    return this.findById(id);
  },

  async softDelete(id: string, deletedBy: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing || existing.ownerId !== deletedBy) {
      return false;
    }

    const now = new Date();
    await db
      .update(listings)
      .set({ deletedAt: now, deletedBy, updatedAt: now })
      .where(eq(listings.id, id));

    await db
      .update(listingPhotos)
      .set({ deletedAt: now, deletedBy })
      .where(and(eq(listingPhotos.listingId, id), activePhotosCondition()));

    return true;
  },
};
