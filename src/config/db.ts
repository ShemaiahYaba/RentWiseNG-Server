import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema/index.js';
import { env } from './env.js';

export const sql = neon(env.DATABASE_URL);
export const db = drizzle(sql, { schema });

export async function testDatabaseConnection(): Promise<boolean> {
  const { logger } = await import('../lib/logger.js');
  try {
    await sql`SELECT 1`;
    logger.info('Database connection established');
    return true;
  } catch (error) {
    logger.error({ err: error }, 'Database connection failed');
    return false;
  }
}
