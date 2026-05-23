import { notImplemented } from '../../lib/notImplemented.js';

export const listingService = {
  async search(_query: unknown) {
    notImplemented('listings.search');
  },
  async getById(_id: string) {
    notImplemented('listings.getById');
  },
  async create(_userId: string, _data: unknown) {
    notImplemented('listings.create');
  },
  async update(_userId: string, _id: string, _data: unknown) {
    notImplemented('listings.update');
  },
  async remove(_userId: string, _id: string) {
    notImplemented('listings.remove');
  },
};
