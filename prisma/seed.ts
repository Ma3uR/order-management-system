import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Initializes the database with seed data for various entities.
 * This asynchronous function creates or updates default entries for currency,
 * status, delivery method, and payment method using Prisma ORM.
 * @returns {Promise<void>} A promise that resolves when all seed data has been created successfully.
 */
async function main() {
  // Create default currency
  await prisma.currency.upsert({
    where: { code: 'UAH' },
    update: {},
    create: {
      code: 'UAH',
      name: 'Ukrainian Hryvnia',
      symbol: '₴',
      isDefault: true,
    },
  });

  // Create default status
  await prisma.status.upsert({
    where: { name: 'Being processed by manager' },
    update: {},
    create: {
      name: 'Being processed by manager',
      color: '#FFD700',
      priority: 0,
    },
  });

  // Create delivery methods
  await prisma.deliveryMethod.upsert({
    where: { name: 'Ukr poshta' },
    update: {},
    create: {
      name: 'Ukr poshta',
    },
  });

  // Create payment methods
  await prisma.paymentMethod.upsert({
    where: { name: 'test2' },
    update: {},
    create: {
      name: 'test2',
    },
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
