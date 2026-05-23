import { notImplemented } from '../../lib/notImplemented.js';

export const paymentService = {
  async initiate(_tenantId: string, _data: unknown) {
    notImplemented('payments.initiate');
  },
  async handleWebhook(_payload: unknown, _signature: string) {
    notImplemented('payments.webhook');
  },
  async release(_tenantId: string, _paymentId: string) {
    notImplemented('payments.release');
  },
  async getById(_userId: string, _id: string) {
    notImplemented('payments.getById');
  },
  async listMine(_userId: string) {
    notImplemented('payments.listMine');
  },
};
