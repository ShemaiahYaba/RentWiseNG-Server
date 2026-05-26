import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { sql } from '@/config/db.js';

const SALT_ROUNDS = 12;

async function seed() {
  console.log('Seeding Database');

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

      const result = await sql`
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
      // Handle duplicate email/phone errors gracefully
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

  console.log('Seeding complete');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed', err);
  process.exit(1);
});
