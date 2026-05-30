import { AppError } from '@/lib/errors.js';
import { conversationRepo } from './conversation.repo.js';
import {
  MessageQueryInput,
  SendMessageInput,
  StartConversationInput,
} from './conversation.schema.js';
import { listingRepo } from '../listings/listing.repo.js';

export const conversationService = {
  async list(_userId: string) {
    const conversations = await conversationRepo.listForUser(_userId);
    return conversations;
  },
  async getMessages(_userId: string, _conversationId: string, query: MessageQueryInput) {
    const conversation = await conversationRepo.findById(_conversationId);
    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    const isParticipant =
      conversation.participantOne === _userId || conversation.participantTwo === _userId;
    if (!isParticipant) {
      throw new AppError('You are not a participant in this conversation', 403);
    }

    const { page, limit } = query;
    const messageList = await conversationRepo.listMessages(_conversationId, page, limit);

    return { messages: messageList, pagination: { page, limit } };
  },
  async start(_userId: string, _data: StartConversationInput) {
    if (_data.participantId === _userId) {
      throw new AppError("You can't have a conversation with yourself", 400);
    }

    // Checking if listing exists
    const listing = await listingRepo.findById(_data.listingId);
    if (!listing) {
      throw new AppError('Listing not found', 404);
    }

    // Idempotency - check if conversation already exists
    const existing = await conversationRepo.findExisting(
      _data.listingId,
      _userId,
      _data.participantId,
    );
    if (existing) {
      return { conversation: existing, created: false };
    }

    const conversation = await conversationRepo.create({
      listingId: _data.listingId,
      participantOne: _userId,
      participantTwo: _data.participantId,
    });

    return { conversation, created: true };
  },
  async sendMessage(_userId: string, _conversationId: string, _data: SendMessageInput) {
    const conversation = await conversationRepo.findById(_conversationId);
    if (!conversation) {
      throw new AppError('conversation not found', 404);
    }

    const isParticipant =
      conversation?.participantOne === _userId || conversation?.participantTwo === _userId;
    if (!isParticipant) {
      throw new AppError('You are not a participant in this conversation', 403);
    }

    const message = await conversationRepo.createMessage({
      senderId: _userId,
      conversationId: _conversationId,
      content: _data.content,
    });

    return message;
  },
};
