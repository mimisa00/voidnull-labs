import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create default roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Administrator role with full permissions',
    },
  })

  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: {
      name: 'user',
      description: 'Regular user role',
    },
  })

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
    // New permissions for Phase 1
    { name: 'games:join', resource: 'games', action: 'join' },
    { name: 'games:play', resource: 'games', action: 'play' },
    { name: 'games:admin', resource: 'games', action: 'admin' },
    { name: 'wallet:read', resource: 'wallet', action: 'read' },
    { name: 'wallet:deposit', resource: 'wallet', action: 'deposit' },
    { name: 'wallet:withdraw', resource: 'wallet', action: 'withdraw' },
    { name: 'leaderboard:read', resource: 'leaderboard', action: 'read' },
    { name: 'statistics:read', resource: 'statistics', action: 'read' },
    { name: 'chat:send', resource: 'chat', action: 'send' },
    { name: 'chat:read', resource: 'chat', action: 'read' },
    { name: 'tournament:create', resource: 'tournament', action: 'create' },
    { name: 'tournament:join', resource: 'tournament', action: 'join' },
    { name: 'tournament:read', resource: 'tournament', action: 'read' },
  ]

  // Create permissions and build a map of name to id
  const permIdMap: Record<string, string> = {}
  for (const perm of permissions) {
    const permission = await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    })
    permIdMap[perm.name] = permission.id
  }

  // Create role permissions
  const rolePermissions = [
    // Admin role - all 24 permissions
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
    { roleId: adminRole.id, permissionName: 'games:join' },
    { roleId: adminRole.id, permissionName: 'games:play' },
    { roleId: adminRole.id, permissionName: 'games:admin' },
    { roleId: adminRole.id, permissionName: 'wallet:read' },
    { roleId: adminRole.id, permissionName: 'wallet:deposit' },
    { roleId: adminRole.id, permissionName: 'wallet:withdraw' },
    { roleId: adminRole.id, permissionName: 'leaderboard:read' },
    { roleId: adminRole.id, permissionName: 'statistics:read' },
    { roleId: adminRole.id, permissionName: 'chat:send' },
    { roleId: adminRole.id, permissionName: 'chat:read' },
    { roleId: adminRole.id, permissionName: 'tournament:create' },
    { roleId: adminRole.id, permissionName: 'tournament:join' },
    { roleId: adminRole.id, permissionName: 'tournament:read' },
    // User role - 11 permissions (original 2 + new 9)
    { roleId: userRole.id, permissionName: 'games:read' },
    { roleId: userRole.id, permissionName: 'client:read' },
    { roleId: userRole.id, permissionName: 'games:join' },
    { roleId: userRole.id, permissionName: 'games:play' },
    { roleId: userRole.id, permissionName: 'wallet:read' },
    { roleId: userRole.id, permissionName: 'leaderboard:read' },
    { roleId: userRole.id, permissionName: 'statistics:read' },
    { roleId: userRole.id, permissionName: 'chat:send' },
    { roleId: userRole.id, permissionName: 'chat:read' },
    { roleId: userRole.id, permissionName: 'tournament:join' },
    { roleId: userRole.id, permissionName: 'tournament:read' },
  ]

  for (const rp of rolePermissions) {
    const permId = permIdMap[rp.permissionName]

    // Check if this role-permission already exists
    const existing = await prisma.rolePermission.findFirst({
      where: {
        roleId: rp.roleId,
        permissionId: permId,
      },
    })

    if (!existing) {
      await prisma.rolePermission.create({
        data: {
          roleId: rp.roleId,
          permissionId: permId,
        },
      })
    }
  }

  // Create default admin user
  const hashedPassword = await bcrypt.hash('Admin@123456', 12)
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
  })

  // Assign admin role to admin user
  const adminUserRole = await prisma.userRole.findFirst({
    where: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  })

  if (!adminUserRole) {
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    })
  }

  // Create default user
  const userHashedPassword = await bcrypt.hash('User@123456', 12)
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
  })

  // Assign user role to regular user
  const userUserRole = await prisma.userRole.findFirst({
    where: {
      userId: regularUser.id,
      roleId: userRole.id,
    },
  })

  if (!userUserRole) {
    await prisma.userRole.create({
      data: {
        userId: regularUser.id,
        roleId: userRole.id,
      },
    })
  }

  // Create wallets for the seeded users so game betting/payout flows don't 404.
  // upsert with empty update: re-runs keep the existing balance (no reset).
  const initialWalletBalance = 1000

  await prisma.wallet.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      balance: initialWalletBalance,
      currency: 'USD',
    },
  })

  await prisma.wallet.upsert({
    where: { userId: regularUser.id },
    update: {},
    create: {
      userId: regularUser.id,
      balance: initialWalletBalance,
      currency: 'USD',
    },
  })

  // Create the house pool row (single row by convention, no unique constraint).
  // findFirst -> create keeps re-runs idempotent: balance is never reset.
  const houseAsset = await prisma.cageAsset.findFirst({
    where: { assetType: 'house_rolling' },
  })

  if (!houseAsset) {
    await prisma.cageAsset.create({
      data: { assetType: 'house_rolling', amount: 100000 },
    })
  }

  console.log('Database seeded successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
