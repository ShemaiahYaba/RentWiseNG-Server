import { createPresignedUpload } from '@/config/r2.js';
import type { PresignInput } from './media.schema.js';

export const mediaService = {
  async presign(userId: string, input: PresignInput) {
    return createPresignedUpload({
      userId,
      filename: input.filename,
      contentType: input.contentType,
      purpose: input.purpose,
    });
  },
};
