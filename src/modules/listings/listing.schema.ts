import { z } from 'zod';

export const createListingSchema = z.object({
  locationId: z.string().uuid(),
  apartmentTypeId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  rentAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'rentAmount must be a valid decimal'),
  ownershipDocUrl: z.string().url(),
  videoUrl: z.string().url().optional(),
  photoUrls: z.array(z.string().url()).min(1).max(10),
});

export const updateListingSchema = createListingSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'at least one field is required',
  });

export const listingSearchSchema = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  apartmentTypeId: z.string().uuid().optional(),
  minRent: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),
  maxRent: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type ListingSearchInput = z.infer<typeof listingSearchSchema>;
