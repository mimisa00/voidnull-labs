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
    { name: 'operations:read', resource: 'operations', action: 'read' },
    { name: 'approval:read', resource: 'approval', action: 'read' },
    { name: 'client:read', resource: 'client', action: 'read' },
  ];


// Create permissions and build a map of name to id
const permIdMap: Record<string,string> = {};
for (const perm of permissions) {
  const permission = await prisma.permission.upsert({
    where: { name: perm.name },
    update: {},
    create: perm,
  });
  permIdMap[perm.name] = permission.id;
}

// Create role permissions
const rolePermissions = [
  { roleId: adminRole.id, permissionName: 'users:list' },
  { roleId: adminRole.id, permissionName: 'users:create' },
  { roleId: adminRole.id, permissionName: 'users:update' },
  { roleId: adminRole.id, permissionName: 'users:delete' },
  { roleId: adminRole.id, permissionName: 'games:create' },
  { roleId: adminRole.id, permissionName: 'games:read' },
  { roleId: adminRole.id, permissionName: 'games:update' },
  { roleId: adminRole.id, permissionName: 'games:delete' },
  { roleId: adminRole.id, permissionName: 'operations:read' },
  { roleId: adminRole.id, permissionName: 'approval:read' },
  { roleId: adminRole.id, permissionName: 'client:read' },
  { roleId: userRole.id, permissionName: 'games:read' },
  { roleId: userRole.id, permissionName: 'client:read' },
];

for (const rp of rolePermissions) {
  await prisma.rolePermission.create({
    data: {
      roleId: rp.roleId,
      permissionId: permIdMap[rp.permissionName],
    },
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
await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    });

  // Create default user
  const userHashedPassword = await bcrypt.hash('User@123456', 12);
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@voidnull.io' },
    update: {},
    create: {
      email: 'user@voidnull.io',
      username: 'user',
      password: userHashedPassword,
      displayName: 'Regular User',
      isActive: true,
    },
  });

  // Assign user role to regular user
  await prisma.userRole.create({
    data: {
      userId: regularUser.id,
      roleId: userRole.id,
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
