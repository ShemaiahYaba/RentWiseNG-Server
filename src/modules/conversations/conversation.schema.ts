import { z } from 'zod';

export const startConversationSchema = z.object({
  listingId: z.string().uuid(),
  participantId: z.string().uuid(),
});

export const messageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty.'),
});

export type StartConversationInput = z.infer<typeof startConversationSchema>;
export type MessageQueryInput = z.infer<typeof messageQuerySchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
