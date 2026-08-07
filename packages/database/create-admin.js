const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
(async () => {
  const hash = await bcrypt.hash('Admin@123456', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@voidnull.io' },
    update: {},
    create: {
      email: 'admin@voidnull.io',
      username: 'admin',
      password: hash,
      displayName: 'Admin',
      isActive: true,
    },
  });
  console.log('Admin user created:', user.id);
})().finally(() => prisma.$disconnect());
