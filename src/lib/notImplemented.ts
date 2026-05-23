import { AppError } from './errors.js';

export function notImplemented(feature: string): never {
  throw new AppError(`${feature} is not implemented yet`, 501);
}
