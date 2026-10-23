import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import { config } from '../src/config/env.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  const isProduction = config.nodeEnv === 'production';

  if (!isProduction) {
    // Development / non-production: seed demo admin and creator with verified email
    const passwordHash = await bcrypt.hash('password123', 10);
    const now = new Date();

    const admin = await prisma.users.upsert({
      where: { username: 'admin' },
      update: {
        email: 'admin@visumatch.local',
        email_verified_at: now,
      },
      create: {
        username: 'admin',
        email: 'admin@visumatch.local',
        password_hash: passwordHash,
        role: Role.Admin,
        email_verified_at: now,
      },
    });
    console.log('Seeded Admin:', admin.username);

    const creator = await prisma.users.upsert({
      where: { username: 'creator' },
      update: {
        email: 'creator@visumatch.local',
        email_verified_at: now,
      },
      create: {
        username: 'creator',
        email: 'creator@visumatch.local',
        password_hash: passwordHash,
        role: Role.Creator,
        email_verified_at: now,
      },
    });
    console.log('Seeded Creator:', creator.username);
  } else {
    // Production: only seed if ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD are provided
    if (config.adminUsername && config.adminEmail && config.adminPassword) {
      const passwordHash = await bcrypt.hash(config.adminPassword, 10);
      const now = new Date();

      const prodAdmin = await prisma.users.upsert({
        where: { username: config.adminUsername },
        update: {
          email: config.adminEmail,
          password_hash: passwordHash,
          role: Role.Admin,
          email_verified_at: now,
        },
        create: {
          username: config.adminUsername,
          email: config.adminEmail,
          password_hash: passwordHash,
          role: Role.Admin,
          email_verified_at: now,
        },
      });
      console.log('Seeded Production Admin:', prodAdmin.username);
    } else {
      console.log('Skipping production admin seeding (ADMIN_USERNAME, ADMIN_EMAIL, or ADMIN_PASSWORD not set).');
    }
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

