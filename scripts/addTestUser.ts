import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

/**
 * Creates or updates a user with hashed password
 * @async
 * @returns {Object} The created or updated user object
 * @throws {Error} If there's an issue with bcrypt hashing or database operation
 */
async function main() {
  const hashedPassword = await bcrypt.hash('testpassword', 10)
  
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      password: hashedPassword,
    },
  })

  console.log({ user })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
