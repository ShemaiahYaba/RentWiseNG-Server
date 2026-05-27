import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { kycStatusLogs, kycSubmissions } from '@/db/schema/kyc.js';
import {
  apartmentTypes,
  listingPhotos,
  listingVerificationLogs,
  listings,
  locations,
} from '@/db/schema/listings.js';
import { users } from '@/db/schema/users.js';

export const adminRepo = {
  async listPendingListings() {
    const rows = await db
      .select({
        listing: listings,
        location: locations,
        apartmentType: apartmentTypes,
        owner: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
        },
      })
      .from(listings)
      .innerJoin(locations, eq(listings.locationId, locations.id))
      .innerJoin(apartmentTypes, eq(listings.apartmentTypeId, apartmentTypes.id))
      .innerJoin(users, eq(listings.ownerId, users.id))
      .where(and(eq(listings.verificationStatus, 'pending'), isNull(listings.deletedAt)))
      .orderBy(desc(listings.createdAt));

    const queue = [];
    for (const row of rows) {
      const photos = await db
        .select({
          id: listingPhotos.id,
          photoUrl: listingPhotos.photoUrl,
          sortOrder: listingPhotos.sortOrder,
        })
        .from(listingPhotos)
        .where(and(eq(listingPhotos.listingId, row.listing.id), isNull(listingPhotos.deletedAt)))
        .orderBy(asc(listingPhotos.sortOrder));

      queue.push({
        ...row.listing,
        location: {
          id: row.location.id,
          state: row.location.state,
          city: row.location.city,
          area: row.location.area,
        },
        apartmentType: {
          id: row.apartmentType.id,
          label: row.apartmentType.label,
        },
        owner: row.owner,
        photos,
      });
    }

    return queue;
  },

  async updateListingVerification(
    adminId: string,
    listingId: string,
    toStatus: 'verified' | 'limited' | 'rejected',
    note?: string,
  ) {
    const [listing] = await db
      .select()
      .from(listings)
      .where(and(eq(listings.id, listingId), isNull(listings.deletedAt)))
      .limit(1);

    if (!listing) {
      return undefined;
    }

    const fromStatus = listing.verificationStatus;

    const [updated] = await db
      .update(listings)
      .set({
        verificationStatus: toStatus,
        updatedAt: new Date(),
      })
      .where(eq(listings.id, listingId))
      .returning();

    await db.insert(listingVerificationLogs).values({
      listingId,
      fromStatus,
      toStatus,
      reviewedBy: adminId,
      note,
    });

    return updated;
  },

  async listPendingKyc() {
    const rows = await db
      .select({
        submission: kycSubmissions,
        user: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
        },
      })
      .from(kycSubmissions)
      .innerJoin(users, eq(kycSubmissions.userId, users.id))
      .where(and(eq(kycSubmissions.status, 'pending'), isNull(kycSubmissions.deletedAt)))
      .orderBy(desc(kycSubmissions.submittedAt));

    return rows.map(({ submission, user }) => {
      const { documentNumber: _, ...safeSubmission } = submission;
      return {
        ...safeSubmission,
        user,
      };
    });
  },

  async updateKycDecision(
    adminId: string,
    kycId: string,
    toStatus: 'approved' | 'rejected',
    rejectionReason?: string,
  ) {
    const [submission] = await db
      .select()
      .from(kycSubmissions)
      .where(and(eq(kycSubmissions.id, kycId), isNull(kycSubmissions.deletedAt)))
      .limit(1);

    if (!submission) {
      return undefined;
    }

    const fromStatus = submission.status;
    const now = new Date();

    const [updated] = await db
      .update(kycSubmissions)
      .set({
        status: toStatus,
        reviewedBy: adminId,
        reviewedAt: now,
        rejectionReason: toStatus === 'rejected' ? rejectionReason : null,
      })
      .where(eq(kycSubmissions.id, kycId))
      .returning();

    await db.insert(kycStatusLogs).values({
      kycId,
      fromStatus,
      toStatus,
      changedBy: adminId,
      note: toStatus === 'rejected' ? rejectionReason : undefined,
    });

    const { documentNumber: _, ...safe } = updated;
    return safe;
  },
};
