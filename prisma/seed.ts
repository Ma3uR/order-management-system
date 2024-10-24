import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Seed Currencies
  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$', isDefault: true },
    { code: 'EUR', name: 'Euro', symbol: '€', isDefault: false },
    { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴', isDefault: false },
  ]

  for (const currency of currencies) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: {},
      create: currency,
    })
  }

  // Seed Statuses
  const statuses = [
    { name: 'Pending', color: '#FFA500' },
    { name: 'Processing', color: '#1E90FF' },
    { name: 'Shipped', color: '#32CD32' },
    { name: 'Delivered', color: '#008000' },
    { name: 'Cancelled', color: '#FF0000' },
  ]

  for (const status of statuses) {
    await prisma.status.upsert({
      where: { name: status.name },
      update: {},
      create: status,
    })
  }

  // Seed Payment Methods
  const paymentMethods = [
    { name: 'Credit Card' },
    { name: 'PayPal' },
    { name: 'Bank Transfer' },
    { name: 'Cash on Delivery' },
  ]

  for (const method of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { name: method.name },
      update: {},
      create: method,
    })
  }

  console.log('Seed data inserted successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
