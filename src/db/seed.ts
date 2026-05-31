import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { sql } from '@/config/db.js';
import { db } from '@/config/db.js';
import { systemConfig } from '@/db/schema/auditLogs.js';
import { apartmentTypes, listingPhotos, listings, locations } from '@/db/schema/listings.js';
import { users } from '@/db/schema/users.js';

const SALT_ROUNDS = 12;

const APARTMENT_TYPE_LABELS = [
  'self_contain',
  'one_bedroom',
  'two_bedroom',
  'flat',
  'duplex',
  'bungalow',
] as const;

const LOCATION_ROWS: { state: string; city: string; area: string }[] = [
  { state: 'Lagos', city: 'Lagos', area: 'Lekki Phase 1' },
  { state: 'Lagos', city: 'Lagos', area: 'Yaba' },
  { state: 'Lagos', city: 'Lagos', area: 'Ikeja GRA' },
  { state: 'Lagos', city: 'Lagos', area: 'Surulere' },
  { state: 'Lagos', city: 'Lagos', area: 'Victoria Island' },
  { state: 'Abuja', city: 'Abuja', area: 'Maitama' },
  { state: 'Abuja', city: 'Abuja', area: 'Gwarinpa' },
  { state: 'Abuja', city: 'Abuja', area: 'Wuse 2' },
  { state: 'Rivers', city: 'Port Harcourt', area: 'GRA Phase 2' },
  { state: 'Oyo', city: 'Ibadan', area: 'Bodija' },
];

const SYSTEM_CONFIG_ROWS: {
  key: string;
  value: string;
  description: string;
}[] = [
  {
    key: 'payment_release_window_hours',
    value: '48',
    description: 'Hours after inspection before auto-release',
  },
  {
    key: 'max_listing_photos',
    value: '10',
    description: 'Maximum photos per listing',
  },
  {
    key: 'inspection_advance_booking_days',
    value: '3',
    description: 'Minimum days ahead for inspection booking',
  },
  {
    key: 'kyc_required_for_listing',
    value: 'true',
    description: 'Require approved KYC before creating listings',
  },
  {
    key: 'max_active_listings_per_agent',
    value: '20',
    description: 'Maximum active listings per agent',
  },
];

async function seedUsers() {
  const accounts = [
    {
      role: 'admin',
      fullName: 'RentWise Admin',
      email: 'admin@rentwiseng.com',
      phone: '+2348000000001',
      password: 'Admin@1234',
      emailVerified: true,
      phoneVerified: true,
    },
    {
      role: 'agent',
      fullName: 'Test Agent',
      email: 'agent@rentwiseng.com',
      phone: '+2348000000002',
      password: 'Agent@1234',
      emailVerified: true,
      phoneVerified: true,
    },
    {
      role: 'landlord',
      fullName: 'Test Landlord',
      email: 'landlord@rentwiseng.com',
      phone: '+2348000000003',
      password: 'Landlord@1234',
      emailVerified: true,
      phoneVerified: true,
    },
    {
      role: 'tenant',
      fullName: 'Test Tenant',
      email: 'tenant@rentwiseng.com',
      phone: '+2348000000004',
      password: 'Tenant@1234',
      emailVerified: true,
      phoneVerified: true,
    },
  ];

  for (const account of accounts) {
    try {
      const { password, ...rest } = account;
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const id = randomUUID();
      const now = new Date().toISOString();

      await sql`
        INSERT INTO users (
          id,
          role,
          full_name,
          email,
          phone,
          password_hash,
          email_verified,
          phone_verified,
          is_active,
          created_at,
          updated_at
        )
        VALUES (
          ${id},
          ${rest.role},
          ${rest.fullName},
          ${rest.email},
          ${rest.phone},
          ${passwordHash},
          ${rest.emailVerified},
          ${rest.phoneVerified},
          true,
          ${now},
          ${now}
        )
      `;

      console.log(`Seeding: ${account.email} (${account.role})`);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('unique') || error.message.includes('already exists'))
      ) {
        console.log(`Skipping: ${account.email} (${account.role}) - already exists`);
      } else {
        throw error;
      }
    }
  }
}

async function seedPlatformData() {
  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, 'admin@rentwiseng.com'))
    .limit(1);

  if (!admin) {
    console.log('Skipping platform seed: admin user not found');
    return;
  }

  for (const label of APARTMENT_TYPE_LABELS) {
    try {
      await db.insert(apartmentTypes).values({ label });
      console.log(`Seeding apartment type: ${label}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('unique')) {
        console.log(`Skipping apartment type: ${label} - already exists`);
      } else {
        throw error;
      }
    }
  }

  for (const row of LOCATION_ROWS) {
    const existing = await db
      .select({ id: locations.id })
      .from(locations)
      .where(
        and(
          eq(locations.state, row.state),
          eq(locations.city, row.city),
          eq(locations.area, row.area),
          isNull(locations.deletedAt),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(`Skipping location: ${row.area}, ${row.city}`);
      continue;
    }

    await db.insert(locations).values(row);
    console.log(`Seeding location: ${row.area}, ${row.city}`);
  }

  for (const row of SYSTEM_CONFIG_ROWS) {
    const existing = await db
      .select({ id: systemConfig.id })
      .from(systemConfig)
      .where(eq(systemConfig.key, row.key))
      .limit(1);

    if (existing.length > 0) {
      console.log(`Skipping system config: ${row.key}`);
      continue;
    }

    await db.insert(systemConfig).values({
      key: row.key,
      value: row.value,
      description: row.description,
      updatedBy: admin.id,
    });
    console.log(`Seeding system config: ${row.key}`);
  }
}

async function seedListings() {
  const [agent] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, 'agent@rentwiseng.com'))
    .limit(1);

  if (!agent) {
    console.log('Skipping listings seed: agent user not found');
    return;
  }

  const locationRows = await db
    .select({ id: locations.id, area: locations.area })
    .from(locations)
    .where(isNull(locations.deletedAt));

  const apartmentTypeRows = await db
    .select({ id: apartmentTypes.id, label: apartmentTypes.label })
    .from(apartmentTypes)
    .where(isNull(apartmentTypes.deletedAt));

  if (locationRows.length === 0 || apartmentTypeRows.length === 0) {
    console.log('Skipping listings seed: locations or apartment types not found');
    return;
  }

  // Helper to find by name
  const locationId = (area: string) => locationRows.find((l) => l.area === area)?.id;
  const apartmentTypeId = (label: string) => apartmentTypeRows.find((a) => a.label === label)?.id;

  const listingSeedData = [
    {
      title: '2 Bedroom Flat in Lekki Phase 1',
      description: 'Spacious 2 bedroom flat with 24/7 power supply, water and good security.',
      rentAmount: '2500000.00',
      locationArea: 'Lekki Phase 1',
      apartmentTypeLabel: 'two_bedroom',
      ownershipDocUrl: 'https://example.com/docs/lekki-ownership.pdf',
      photoUrls: ['https://example.com/photos/lekki-1.jpg'],
    },
    {
      title: 'Self Contain in Yaba',
      description: 'Clean self contain with kitchen and bathroom. Close to bus stop.',
      rentAmount: '600000.00',
      locationArea: 'Yaba',
      apartmentTypeLabel: 'self_contain',
      ownershipDocUrl: 'https://example.com/docs/yaba-ownership.pdf',
      photoUrls: ['https://example.com/photos/yaba-1.jpg'],
    },
    {
      title: 'Mini Flat in Surulere',
      description: 'Neat mini flat in a quiet estate. Tiled floors, good ventilation.',
      rentAmount: '900000.00',
      locationArea: 'Surulere',
      apartmentTypeLabel: 'one_bedroom',
      ownershipDocUrl: 'https://example.com/docs/surulere-ownership.pdf',
      photoUrls: ['https://example.com/photos/surulere-1.jpg'],
    },
    {
      title: 'Duplex in Maitama Abuja',
      description: 'Luxury 4 bedroom duplex with BQ, swimming pool and parking space.',
      rentAmount: '8000000.00',
      locationArea: 'Maitama',
      apartmentTypeLabel: 'duplex',
      ownershipDocUrl: 'https://example.com/docs/maitama-ownership.pdf',
      photoUrls: ['https://example.com/photos/maitama-1.jpg'],
    },
    {
      title: 'Bungalow in Bodija Ibadan',
      description: '3 bedroom bungalow with large compound. Serene environment.',
      rentAmount: '700000.00',
      locationArea: 'Bodija',
      apartmentTypeLabel: 'bungalow',
      ownershipDocUrl: 'https://example.com/docs/bodija-ownership.pdf',
      photoUrls: ['https://example.com/photos/bodija-1.jpg'],
    },
  ];

  for (const data of listingSeedData) {
    const locId = locationId(data.locationArea);
    const aptId = apartmentTypeId(data.apartmentTypeLabel);

    if (!locId || !aptId) {
      console.log(`Skipping listing: ${data.title} - missing location or apartment type`);
      continue;
    }

    // Check if listing already exists by title + owner
    const existing = await db
      .select({ id: listings.id })
      .from(listings)
      .where(
        and(
          eq(listings.title, data.title),
          eq(listings.ownerId, agent.id),
          isNull(listings.deletedAt),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(`Skipping listing: ${data.title} - already exists`);
      continue;
    }

    const [listing] = await db
      .insert(listings)
      .values({
        ownerId: agent.id,
        locationId: locId,
        apartmentTypeId: aptId,
        title: data.title,
        description: data.description,
        rentAmount: data.rentAmount,
        ownershipDocUrl: data.ownershipDocUrl,
        verificationStatus: 'verified', // ← must be verified for smoke test
        availabilityStatus: 'available',
      })
      .returning();

    await db.insert(listingPhotos).values(
      data.photoUrls.map((photoUrl, index) => ({
        listingId: listing.id,
        photoUrl,
        sortOrder: index,
      })),
    );

    console.log(`Seeding listing: ${data.title}`);
  }
}

async function seed() {
  console.log('Seeding Database');
  await seedUsers();
  await seedPlatformData();
  await seedListings();
  console.log('Seeding complete');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed', err);
  process.exit(1);
});
