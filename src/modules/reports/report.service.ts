import { notImplemented } from '../../lib/notImplemented.js';

export const reportService = {
  async create(_userId: string, _data: unknown) {
    notImplemented('reports.create');
  },
  async listMine(_userId: string) {
    notImplemented('reports.listMine');
  },
};
