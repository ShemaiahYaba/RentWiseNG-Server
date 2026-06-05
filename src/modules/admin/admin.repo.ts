import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { systemConfig } from '@/db/schema/auditLogs.js';
import { kycStatusLogs, kycSubmissions } from '@/db/schema/kyc.js';
import {
  apartmentTypes,
  listingPhotos,
  listingVerificationLogs,
  listings,
  locations,
} from '@/db/schema/listings.js';
import { reportStatusLogs, reports } from '@/db/schema/reports.js';
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

  async listModerationQueue() {
    const rows = await db
      .select({
        report: reports,
        reporter: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
        },
      })
      .from(reports)
      .innerJoin(users, eq(reports.reporterId, users.id))
      .where(
        and(
          inArray(reports.status, ['open', 'under_review']),
          isNull(reports.deletedAt),
        ),
      )
      .orderBy(desc(reports.createdAt));

    const queue = [];
    for (const { report, reporter } of rows) {
      let target: { type: string; id: string; label: string } | null = null;

      if (report.targetType === 'listing') {
        const [listing] = await db
          .select({ id: listings.id, title: listings.title })
          .from(listings)
          .where(and(eq(listings.id, report.targetId), isNull(listings.deletedAt)))
          .limit(1);
        if (listing) {
          target = { type: 'listing', id: listing.id, label: listing.title };
        }
      } else if (report.targetType === 'user') {
        const [user] = await db
          .select({ id: users.id, fullName: users.fullName })
          .from(users)
          .where(and(eq(users.id, report.targetId), isNull(users.deletedAt)))
          .limit(1);
        if (user) {
          target = { type: 'user', id: user.id, label: user.fullName };
        }
      }

      queue.push({ ...report, reporter, target });
    }

    return queue;
  },

  async findReportById(reportId: string) {
    const [row] = await db
      .select()
      .from(reports)
      .where(and(eq(reports.id, reportId), isNull(reports.deletedAt)))
      .limit(1);
    return row;
  },

  async updateReportStatus(
    adminId: string,
    reportId: string,
    toStatus: 'under_review' | 'resolved' | 'dismissed',
    note?: string,
  ) {
    const report = await this.findReportById(reportId);
    if (!report) {
      return undefined;
    }

    const fromStatus = report.status;

    const [updated] = await db
      .update(reports)
      .set({ status: toStatus })
      .where(eq(reports.id, reportId))
      .returning();

    await db.insert(reportStatusLogs).values({
      reportId,
      fromStatus,
      toStatus,
      actionedBy: adminId,
      note,
    });

    return updated;
  },

  async listSystemConfig() {
    return db
      .select({
        key: systemConfig.key,
        value: systemConfig.value,
        description: systemConfig.description,
        updatedAt: systemConfig.updatedAt,
      })
      .from(systemConfig)
      .orderBy(asc(systemConfig.key));
  },

  async findConfigByKey(key: string) {
    const [row] = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, key))
      .limit(1);
    return row;
  },

  async updateSystemConfig(adminId: string, key: string, value: string) {
    const [updated] = await db
      .update(systemConfig)
      .set({
        value,
        updatedBy: adminId,
        updatedAt: new Date(),
      })
      .where(eq(systemConfig.key, key))
      .returning({
        key: systemConfig.key,
        value: systemConfig.value,
        description: systemConfig.description,
        updatedAt: systemConfig.updatedAt,
      });
    return updated;
  },
};
