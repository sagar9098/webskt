// prisma/seed.js
// Run: node prisma/seed.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo users
  const password = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.upsert({
    where: { username: 'alice' },
    update: {},
    create: { username: 'alice', password },
  });

  const bob = await prisma.user.upsert({
    where: { username: 'bob' },
    update: {},
    create: { username: 'bob', password },
  });

  const charlie = await prisma.user.upsert({
    where: { username: 'charlie' },
    update: {},
    create: { username: 'charlie', password },
  });

  // Create a demo group
  const group = await prisma.group.upsert({
    where: { id: 'seed-group-001' },
    update: {},
    create: {
      id: 'seed-group-001',
      name: 'General',
      createdById: alice.id,
      members: {
        create: [
          { userId: alice.id },
          { userId: bob.id },
          { userId: charlie.id },
        ],
      },
    },
  });

  console.log('✅ Seeded users: alice, bob, charlie (password: password123)');
  console.log('✅ Seeded group: General');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
