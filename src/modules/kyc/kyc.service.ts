import { notImplemented } from '../../lib/notImplemented.js';

export const kycService = {
  async submit(_userId: string, _data: unknown) {
    notImplemented('kyc.submit');
  },
  async getMyStatus(_userId: string) {
    notImplemented('kyc.getMyStatus');
  },
};
