import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Manually seeding database...');

  // Check if admin role exists
  let adminRole = await prisma.role.findUnique({
    where: { name: 'admin' }
  });

  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: {
        name: 'admin',
        description: 'Administrator role with full permissions',
      },
    });
    console.log('Created admin role');
  } else {
    console.log('Admin role already exists');
  }

  // Check if user role exists
  let userRole = await prisma.role.findUnique({
    where: { name: 'user' }
  });

  if (!userRole) {
    userRole = await prisma.role.create({
      data: {
        name: 'user',
        description: 'Regular user role',
      },
    });
    console.log('Created user role');
  } else {
    console.log('User role already exists');
  }

  // Create permissions 
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
    const existing = await prisma.permission.findUnique({
      where: { name: perm.name }
    });
    
    if (!existing) {
      await prisma.permission.create({ data: perm });
      console.log(`Created permission: ${perm.name}`);
    } else {
      console.log(`Permission already exists: ${perm.name}`);
    }
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
    const existing = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId: rp.roleId,
          permissionId: rp.permissionId,
        }
      }
    });
    
    if (!existing) {
      await prisma.rolePermission.create({ data: rp });
      console.log(`Created role-permission mapping for ${rp.permissionId}`);
    } else {
      console.log(`Role-permission mapping already exists for ${rp.permissionId}`);
    }
  }

  // Create default admin user
  const hashedPassword = await bcrypt.hash('Admin@123456', 12);
  
  let adminUser = await prisma.user.findUnique({
    where: { email: 'admin@voidnull.io' }
  });

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@voidnull.io',
        username: 'admin',
        password: hashedPassword,
        displayName: 'Administrator',
        isActive: true,
      },
    });
    console.log('Created default admin user');
  } else {
    console.log('Admin user already exists');
  }

  // Assign admin role to admin user
  const existingUserRole = await prisma.userRole.findUnique({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      }
    }
  });
  
  if (!existingUserRole) {
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    });
    console.log('Assigned admin role to user');
  } else {
    console.log('Admin role already assigned to user');
  }

  console.log('Database manually seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });