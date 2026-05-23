import { notImplemented } from '../../lib/notImplemented.js';

export const inspectionService = {
  async book(_tenantId: string, _data: unknown) {
    notImplemented('inspections.book');
  },
  async getById(_userId: string, _id: string) {
    notImplemented('inspections.getById');
  },
  async updateStatus(_userId: string, _id: string, _status: string) {
    notImplemented('inspections.updateStatus');
  },
  async listMine(_userId: string) {
    notImplemented('inspections.listMine');
  },
};
