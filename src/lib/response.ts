import type { Response } from 'express';

export const ok = <T>(res: Response, data: T, message = 'success') =>
  res.status(200).json({ status: 'success', message, data });

export const created = <T>(res: Response, data: T, message = 'created') =>
  res.status(201).json({ status: 'success', message, data });

export const fail = (res: Response, message = 'something went wrong', code = 500, data: unknown = null) =>
  res.status(code).json({ status: 'error', message, data });
