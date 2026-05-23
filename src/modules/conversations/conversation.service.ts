import { notImplemented } from '../../lib/notImplemented.js';

export const conversationService = {
  async list(_userId: string) {
    notImplemented('conversations.list');
  },
  async getMessages(_userId: string, _conversationId: string) {
    notImplemented('conversations.getMessages');
  },
  async start(_userId: string, _data: unknown) {
    notImplemented('conversations.start');
  },
};
