import { notImplemented } from '../../lib/notImplemented.js';

export const reviewService = {
  async create(_userId: string, _data: unknown) {
    notImplemented('reviews.create');
  },
  async listByListing(_listingId: string) {
    notImplemented('reviews.listByListing');
  },
};
