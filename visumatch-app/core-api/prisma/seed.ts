import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1 Admin
  const admin = await prisma.users.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password_hash: passwordHash,
      role: Role.Admin,
    },
  });
  console.log('Seeded Admin:', admin.username);

  // 1 Creator
  const creator = await prisma.users.upsert({
    where: { username: 'creator' },
    update: {},
    create: {
      username: 'creator',
      password_hash: passwordHash,
      role: Role.Creator,
    },
  });
  console.log('Seeded Creator:', creator.username);

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
