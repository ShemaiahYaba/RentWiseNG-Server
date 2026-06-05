import { auditLogWrite } from '@/lib/auditLogWrite.js';
import { AppError } from '@/lib/errors.js';
import { getConfigBool, getConfigNumber } from '@/lib/systemConfig.js';
import { kycRepo } from '@/modules/kyc/kyc.repo.js';
import { listingRepo } from './listing.repo.js';
import type {
  CreateListingInput,
  ListingSearchInput,
  UpdateListingInput,
} from './listing.schema.js';

export const listingService = {
  async search(query: ListingSearchInput) {
    return listingRepo.searchPublic(query);
  },

  async getById(id: string, viewerId?: string, viewerRole?: string) {
    const listing = await listingRepo.findById(id);
    if (!listing) {
      throw new AppError('listing not found', 404);
    }

    const isOwner = viewerId === listing.ownerId;
    const isAdmin = viewerRole === 'admin';

    if (listing.verificationStatus !== 'verified' && !isOwner && !isAdmin) {
      throw new AppError('listing not found', 404);
    }

    return { listing };
  },

  async create(userId: string, role: string, data: CreateListingInput) {
    const kycRequired = await getConfigBool('kyc_required_for_listing');
    if (kycRequired) {
      const kyc = await kycRepo.findByUserId(userId);
      if (!kyc || kyc.status !== 'approved') {
        throw new AppError('approved KYC is required before creating listings', 403);
      }
    }

    if (role === 'agent') {
      const maxListings = await getConfigNumber('max_active_listings_per_agent');
      const activeCount = await listingRepo.countActiveByOwner(userId);
      if (activeCount >= maxListings) {
        throw new AppError('maximum active listings reached for agent account', 409);
      }
    }

    const maxPhotos = await getConfigNumber('max_listing_photos');
    if (data.photoUrls.length > maxPhotos) {
      throw new AppError(`maximum ${maxPhotos} photos allowed per listing`, 422);
    }

    if (!(await listingRepo.existsLocation(data.locationId))) {
      throw new AppError('location not found', 404);
    }
    if (!(await listingRepo.existsApartmentType(data.apartmentTypeId))) {
      throw new AppError('apartment type not found', 404);
    }

    const listing = await listingRepo.create({
      ownerId: userId,
      locationId: data.locationId,
      apartmentTypeId: data.apartmentTypeId,
      title: data.title,
      description: data.description,
      rentAmount: data.rentAmount,
      ownershipDocUrl: data.ownershipDocUrl,
      videoUrl: data.videoUrl,
      photoUrls: data.photoUrls,
    });

    await auditLogWrite({
      actorId: userId,
      actorRole: role,
      action: 'listing.created',
      entityType: 'listing',
      entityId: listing.id,
      beforeState: null,
      afterState: {
        id: listing.id,
        verificationStatus: listing.verificationStatus,
        availabilityStatus: listing.availabilityStatus,
        title: listing.title,
      },
    });

    return { listing };
  },

  async update(userId: string, role: string, id: string, data: UpdateListingInput) {
    if (data.photoUrls) {
      const maxPhotos = await getConfigNumber('max_listing_photos');
      if (data.photoUrls.length > maxPhotos) {
        throw new AppError(`maximum ${maxPhotos} photos allowed per listing`, 422);
      }
    }

    if (data.locationId && !(await listingRepo.existsLocation(data.locationId))) {
      throw new AppError('location not found', 404);
    }
    if (data.apartmentTypeId && !(await listingRepo.existsApartmentType(data.apartmentTypeId))) {
      throw new AppError('apartment type not found', 404);
    }

    const before = await listingRepo.findById(id);
    if (!before || before.ownerId !== userId) {
      throw new AppError('listing not found', 404);
    }

    const listing = await listingRepo.update(id, userId, data);
    if (!listing) {
      throw new AppError('listing not found', 404);
    }

    await auditLogWrite({
      actorId: userId,
      actorRole: role,
      action: 'listing.updated',
      entityType: 'listing',
      entityId: id,
      beforeState: {
        id: before.id,
        title: before.title,
        verificationStatus: before.verificationStatus,
        availabilityStatus: before.availabilityStatus,
      },
      afterState: {
        id: listing.id,
        title: listing.title,
        verificationStatus: listing.verificationStatus,
        availabilityStatus: listing.availabilityStatus,
      },
    });

    return { listing };
  },

  async remove(userId: string, role: string, id: string) {
    const before = await listingRepo.findById(id);
    if (!before || before.ownerId !== userId) {
      throw new AppError('listing not found', 404);
    }

    const deleted = await listingRepo.softDelete(id, userId);
    if (!deleted) {
      throw new AppError('listing not found', 404);
    }

    await auditLogWrite({
      actorId: userId,
      actorRole: role,
      action: 'listing.deleted',
      entityType: 'listing',
      entityId: id,
      beforeState: {
        id: before.id,
        title: before.title,
        verificationStatus: before.verificationStatus,
        availabilityStatus: before.availabilityStatus,
      },
      afterState: {
        id,
        deleted: true,
      },
    });
  },
};
