import { z } from 'zod';

export const createListingSchema = z.object({
  locationId: z.string().uuid(),
  apartmentTypeId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  rentAmount: z.string(),
  ownershipDocUrl: z.string().url(),
  videoUrl: z.string().url().optional(),
});

export const updateListingSchema = createListingSchema.partial();

export const listingSearchSchema = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});
