import { asc, eq, isNull, and } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { locations } from '@/db/schema/listings.js';

export type LocationRecord = typeof locations.$inferSelect;

export const locationsRepo = {
  async listAll(): Promise<LocationRecord[]> {
    return db
      .select()
      .from(locations)
      .where(isNull(locations.deletedAt))
      .orderBy(asc(locations.state), asc(locations.city), asc(locations.area));
  },

  async findById(id: string): Promise<LocationRecord | undefined> {
    const [row] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, id), isNull(locations.deletedAt)))
      .limit(1);
    return row;
  },
};

