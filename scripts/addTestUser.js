const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

/**
 * Creates or updates a user with a hashed password in the database
 * @returns {Promise<Object>} The created or updated user object
 * @throws {Error} If there's an issue with password hashing or database operation
 */
async function main() {
  const hashedPassword = await bcrypt.hash('testpassword', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      password: hashedPassword,
    },
  });

  console.log({ user });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
