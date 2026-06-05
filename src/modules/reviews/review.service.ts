import { AppError } from '@/lib/errors.js';
import { paymentRepo } from '../payments/payment.repo.js';
import type { CreateReviewInput } from './review.schema.js';
import { reviewRepo } from './review.repo.js';

export const reviewService = {
  async create(userId: string, data: CreateReviewInput) {
    const payment = await paymentRepo.findById(data.paymentId);
    if (!payment) {
      throw new AppError('payment not found', 404);
    }

    if (payment.tenantId !== userId) {
      throw new AppError('only the tenant who made the payment can submit a review', 403);
    }

    if (payment.status !== 'released') {
      throw new AppError('payment must be released before submitting a review', 422);
    }

    if (payment.listingId !== data.listingId) {
      throw new AppError('listing does not match payment', 422);
    }

    const existing = await reviewRepo.findByPaymentId(data.paymentId);
    if (existing) {
      throw new AppError('a review already exists for this payment', 409);
    }

    const listingExists = await reviewRepo.existsListing(data.listingId);
    if (!listingExists) {
      throw new AppError('listing not found', 404);
    }

    const review = await reviewRepo.create({ reviewerId: userId, ...data });
    return review;
  },

  async listByListing(listingId: string) {
    const listingExists = await reviewRepo.existsListing(listingId);
    if (!listingExists) {
      throw new AppError('listing not found', 404);
    }

    const reviews = await reviewRepo.listByListing(listingId);
    return reviews;
  },
};
