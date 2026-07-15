import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const RESOURCES = ['users', 'roles', 'permissions', 'audit-logs'];
const ACTIONS = ['create', 'read', 'update', 'delete', 'list'];

async function main() {
  console.log('Seeding database...');

  // Create all permissions
  const permissions: { name: string; resource: string; action: string }[] = [];
  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      permissions.push({ name: `${resource}:${action}`, resource, action });
    }
  }
  // Extra special permissions
  permissions.push({ name: 'system:admin', resource: 'system', action: 'admin' });

  await prisma.permission.createMany({ data: permissions, skipDuplicates: true });
  console.log(`Created ${permissions.length} permissions`);

  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin', description: '全系統管理員，擁有所有權限' },
  });

  const moderatorRole = await prisma.role.upsert({
    where: { name: 'moderator' },
    update: {},
    create: { name: 'moderator', description: '版主，可管理使用者但不能修改角色' },
  });

  const viewerRole = await prisma.role.upsert({
    where: { name: 'viewer' },
    update: {},
    create: { name: 'viewer', description: '只讀使用者' },
  });

  // Admin gets all permissions
  const allPermissions = await prisma.permission.findMany();
  await prisma.rolePermission.createMany({
    data: allPermissions.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  // Moderator gets user read/list/update
  const moderatorPerms = await prisma.permission.findMany({
    where: {
      OR: [
        { name: { in: ['users:read', 'users:list', 'users:update', 'audit-logs:read', 'audit-logs:list'] } },
      ],
    },
  });
  await prisma.rolePermission.createMany({
    data: moderatorPerms.map((p) => ({ roleId: moderatorRole.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  // Viewer gets only read/list on non-sensitive resources
  const viewerPerms = await prisma.permission.findMany({
    where: { action: { in: ['read', 'list'] }, resource: { in: ['users', 'roles'] } },
  });
  await prisma.rolePermission.createMany({
    data: viewerPerms.map((p) => ({ roleId: viewerRole.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  console.log('Created roles: admin, moderator, viewer');

  // Create admin user
  const hashedPassword = await bcrypt.hash('Admin@123456', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@voidnull.io' },
    update: {},
    create: {
      email: 'admin@voidnull.io',
      username: 'admin',
      password: hashedPassword,
      displayName: 'System Admin',
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  // Create test users
  const testPassword = await bcrypt.hash('Test@123456', 12);

  const modUser = await prisma.user.upsert({
    where: { email: 'moderator@voidnull.io' },
    update: {},
    create: { email: 'moderator@voidnull.io', username: 'moderator', password: testPassword, displayName: 'Moderator' },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: modUser.id, roleId: moderatorRole.id } },
    update: {},
    create: { userId: modUser.id, roleId: moderatorRole.id },
  });

  const viewUser = await prisma.user.upsert({
    where: { email: 'viewer@voidnull.io' },
    update: {},
    create: { email: 'viewer@voidnull.io', username: 'viewer', password: testPassword, displayName: 'Viewer' },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: viewUser.id, roleId: viewerRole.id } },
    update: {},
    create: { userId: viewUser.id, roleId: viewerRole.id },
  });

  console.log('Created users: admin@voidnull.io / Admin@123456');
  console.log('            moderator@voidnull.io / Test@123456');
  console.log('            viewer@voidnull.io / Test@123456');
  console.log('Seeding complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
