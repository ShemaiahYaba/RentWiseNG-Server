import { z } from 'zod';

export const startConversationSchema = z.object({
  listingId: z.string().uuid(),
  participantId: z.string().uuid(),
});
