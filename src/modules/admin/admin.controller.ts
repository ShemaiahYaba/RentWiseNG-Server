import type { NextFunction, Request, Response } from 'express';
import { routeParam } from '@/lib/routeParams.js';
import { ok } from '@/lib/response.js';
import type { AuditLogQuery } from '@/modules/auditLog/auditLog.types.js';
import { adminService } from './admin.service.js';

export const adminController = {
  async listingQueue(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.listingQueue();
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async updateListing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.updateListingVerification(
        req.user!.id,
        routeParam(req.params.id),
        req.body,
      );
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async kycQueue(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.kycQueue();
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async updateKyc(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.updateKyc(
        req.user!.id,
        routeParam(req.params.id),
        req.body,
      );
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async listReports(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.listReports();
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async updateReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.updateReportStatus(
        req.user!.id,
        routeParam(req.params.id),
        req.body,
      );
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.listAuditLogs(req.query as unknown as AuditLogQuery);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async listConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.listConfig();
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async updateConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.updateConfig(
        req.user!.id,
        routeParam(req.params.key),
        req.body,
      );
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
};
