import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Administrator role with full permissions',
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: {
      name: 'user',
      description: 'Regular user role',
    },
  });

  // Create default permissions
  const permissions = [
    { name: 'users:list', resource: 'users', action: 'read' },
    { name: 'users:create', resource: 'users', action: 'create' },
    { name: 'users:update', resource: 'users', action: 'update' },
    { name: 'users:delete', resource: 'users', action: 'delete' },
    { name: 'games:create', resource: 'games', action: 'create' },
    { name: 'games:read', resource: 'games', action: 'read' },
    { name: 'games:update', resource: 'games', action: 'update' },
    { name: 'games:delete', resource: 'games', action: 'delete' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }

  // Create role permissions
  const rolePermissions = [
    { roleId: adminRole.id, permissionId: 'users:list' },
    { roleId: adminRole.id, permissionId: 'users:create' },
    { roleId: adminRole.id, permissionId: 'users:update' },
    { roleId: adminRole.id, permissionId: 'users:delete' },
    { roleId: adminRole.id, permissionId: 'games:create' },
    { roleId: adminRole.id, permissionId: 'games:read' },
    { roleId: adminRole.id, permissionId: 'games:update' },
    { roleId: adminRole.id, permissionId: 'games:delete' },
  ];

  for (const rp of rolePermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: rp.roleId,
          permissionId: rp.permissionId,
        },
      },
      update: {},
      create: rp,
    });
  }

  // Create default admin user
  const hashedPassword = await bcrypt.hash('Admin@123456', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@voidnull.io' },
    update: {},
    create: {
      email: 'admin@voidnull.io',
      username: 'admin',
      password: hashedPassword,
      displayName: 'Administrator',
      isActive: true,
    },
  });

  // Assign admin role to admin user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
