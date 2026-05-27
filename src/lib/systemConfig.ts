import { eq } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { systemConfig } from '@/db/schema/auditLogs.js';
import { AppError } from './errors.js';

export async function getConfig(key: string): Promise<string | null> {
  const [row] = await db
    .select({ value: systemConfig.value })
    .from(systemConfig)
    .where(eq(systemConfig.key, key))
    .limit(1);

  return row?.value ?? null;
}

export async function getConfigRequired(key: string): Promise<string> {
  const value = await getConfig(key);
  if (value === null) {
    throw new AppError(`system config missing: ${key}`, 500);
  }
  return value;
}

export async function getConfigBool(key: string): Promise<boolean> {
  const value = await getConfigRequired(key);
  return value === 'true';
}

export async function getConfigNumber(key: string): Promise<number> {
  const value = await getConfigRequired(key);
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new AppError(`invalid system config number: ${key}`, 500);
  }
  return n;
}
