import type { apartmentTypes, listingPhotos, listings, locations } from '@/db/schema/listings.js';

export type ListingRow = typeof listings.$inferSelect;
export type LocationRow = typeof locations.$inferSelect;
export type ApartmentTypeRow = typeof apartmentTypes.$inferSelect;
export type ListingPhotoRow = typeof listingPhotos.$inferSelect;

export type ListingPhotoView = {
  id: string;
  photoUrl: string;
  sortOrder: number;
};

export type ListingDetail = ListingRow & {
  location: Pick<LocationRow, 'id' | 'state' | 'city' | 'area' | 'latitude' | 'longitude'>;
  apartmentType: Pick<ApartmentTypeRow, 'id' | 'label'>;
  photos: ListingPhotoView[];
};

export type ListingSearchResult = {
  listings: ListingDetail[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type CreateListingData = {
  ownerId: string;
  locationId: string;
  apartmentTypeId: string;
  title: string;
  description: string;
  rentAmount: string;
  ownershipDocUrl: string;
  videoUrl?: string;
  photoUrls: string[];
};

export type UpdateListingData = Partial<
  Omit<CreateListingData, 'ownerId' | 'photoUrls'> & { photoUrls: string[] }
>;
