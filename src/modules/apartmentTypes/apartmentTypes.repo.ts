import { asc, eq, isNull, and } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { apartmentTypes } from '@/db/schema/listings.js';

export type ApartmentTypeRecord = typeof apartmentTypes.$inferSelect;

export const apartmentTypesRepo = {
  async listAll(): Promise<ApartmentTypeRecord[]> {
    return db
      .select()
      .from(apartmentTypes)
      .where(isNull(apartmentTypes.deletedAt))
      .orderBy(asc(apartmentTypes.label));
  },

  async findById(id: string): Promise<ApartmentTypeRecord | undefined> {
    const [row] = await db
      .select()
      .from(apartmentTypes)
      .where(and(eq(apartmentTypes.id, id), isNull(apartmentTypes.deletedAt)))
      .limit(1);
    return row;
  },
};

