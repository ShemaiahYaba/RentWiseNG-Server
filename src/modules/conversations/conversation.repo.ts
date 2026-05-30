import { db } from '@/config/db.js';
import { conversations, messages } from '@/db/schema/conversations.js';
import { and, eq, or, isNull, desc } from 'drizzle-orm';

export type ConversationRecord = typeof conversations.$inferSelect;
export type MessageRecord = typeof messages.$inferSelect;

export type CreateConversationData = {
  listingId: string;
  participantOne: string;
  participantTwo: string;
};

export type CreateMessageData = {
  senderId: string;
  conversationId: string;
  content: string;
};

export const conversationRepo = {
  async listForUser(_userId: string): Promise<ConversationRecord[]> {
    return db
      .select()
      .from(conversations)
      .where(
        and(
          or(eq(conversations.participantOne, _userId), eq(conversations.participantTwo, _userId)),
          isNull(conversations.deletedAt),
        ),
      )
      .orderBy(desc(conversations.createdAt));
  },
  async findById(_id: string): Promise<ConversationRecord | undefined> {
    const [row] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, _id), isNull(conversations.deletedAt)))
      .limit(1);
    return row;
  },
  async create(_data: CreateConversationData): Promise<ConversationRecord> {
    const [row] = await db.insert(conversations).values(_data).returning();
    return row;
  },
  async listMessages(
    _conversationId: string,
    page: number,
    limit: number,
  ): Promise<MessageRecord[]> {
    const offset = (page - 1) * limit;
    return db
      .select()
      .from(messages)
      .where(and(eq(messages.conversationId, _conversationId), isNull(messages.deletedAt)))
      .orderBy(messages.sentAt)
      .limit(limit)
      .offset(offset);
  },
  async findExisting(
    _listingId: string,
    _participantOne: string,
    _participantTwo: string,
  ): Promise<ConversationRecord | undefined> {
    const [row] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.listingId, _listingId),
          or(
            and(
              eq(conversations.participantOne, _participantOne),
              eq(conversations.participantTwo, _participantTwo),
            ),
            and(
              eq(conversations.participantOne, _participantTwo),
              eq(conversations.participantTwo, _participantOne),
            ),
          ),
          isNull(conversations.deletedAt),
        ),
      )
      .limit(1);
    return row;
  },
  async createMessage(_data: CreateMessageData): Promise<MessageRecord> {
    const [row] = await db.insert(messages).values(_data).returning();
    return row;
  },
};
