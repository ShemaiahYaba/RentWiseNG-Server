import { notImplemented } from '../../lib/notImplemented.js';

export const adminService = {
  async listingQueue() {
    notImplemented('admin.listingQueue');
  },
  async updateListingVerification(_adminId: string, _id: string, _status: string) {
    notImplemented('admin.updateListingVerification');
  },
  async kycQueue() {
    notImplemented('admin.kycQueue');
  },
  async updateKyc(_adminId: string, _id: string, _status: string) {
    notImplemented('admin.updateKyc');
  },
  async listReports() {
    notImplemented('admin.listReports');
  },
  async updateReportStatus(_adminId: string, _id: string, _status: string) {
    notImplemented('admin.updateReportStatus');
  },
  async listAuditLogs(_query: unknown) {
    notImplemented('admin.listAuditLogs');
  },
  async listConfig() {
    notImplemented('admin.listConfig');
  },
  async updateConfig(_adminId: string, _key: string, _value: string) {
    notImplemented('admin.updateConfig');
  },
};
