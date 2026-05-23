import type { NextFunction, Request, Response } from 'express';
import { adminService } from './admin.service.js';

export const adminController = {
  async listingQueue(_req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      await adminService.listingQueue();
    } catch (err) {
      next(err);
    }
  },
  async updateListing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await adminService.updateListingVerification(req.user!.id, req.params.id, req.body.status);
    } catch (err) {
      next(err);
    }
  },
  async kycQueue(_req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      await adminService.kycQueue();
    } catch (err) {
      next(err);
    }
  },
  async updateKyc(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await adminService.updateKyc(req.user!.id, req.params.id, req.body.status);
    } catch (err) {
      next(err);
    }
  },
  async listReports(_req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      await adminService.listReports();
    } catch (err) {
      next(err);
    }
  },
  async updateReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await adminService.updateReportStatus(req.user!.id, req.params.id, req.body.status);
    } catch (err) {
      next(err);
    }
  },
  async listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await adminService.listAuditLogs(req.query);
    } catch (err) {
      next(err);
    }
  },
  async listConfig(_req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      await adminService.listConfig();
    } catch (err) {
      next(err);
    }
  },
  async updateConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await adminService.updateConfig(req.user!.id, req.params.key, req.body.value);
    } catch (err) {
      next(err);
    }
  },
};
