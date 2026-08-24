import { UsersService } from '../../src/users/users.service'

describe('UsersService', () => {
  let service: UsersService
  let mockPrisma: any
  let mockWallet: any

  const mockUser = {
    id: 'user-1',
    email: 'user@voidnull.io',
    username: 'user',
    displayName: null,
    isActive: true,
    is2faEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    userRoles: [],
  }

  beforeEach(() => {
    // 建立 mock PrismaService 與 WalletService
    mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(mockUser),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      userRole: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    }
    mockWallet = { ensureWallet: jest.fn() }

    // 直接實例化 UsersService,傳入 mock
    service = new UsersService(mockPrisma, mockWallet)
  })

  describe('assignRoles', () => {
    it('should deduplicate roleIds before writing UserRole rows', async () => {
      // UI/Swagger 傳入重複 roleId 時只應建立唯一列,
      // 否則會撞 UserRole (userId, roleId) unique 約束回 500
      await service.assignRoles('user-1', ['role-1', 'role-1', 'role-2'])

      expect(mockPrisma.userRole.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      })
      expect(mockPrisma.userRole.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 'user-1', roleId: 'role-1' },
          { userId: 'user-1', roleId: 'role-2' },
        ],
      })
    })

    it('should keep all rows when roleIds have no duplicates', async () => {
      await service.assignRoles('user-1', ['role-1', 'role-2', 'role-3'])

      expect(mockPrisma.userRole.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 'user-1', roleId: 'role-1' },
          { userId: 'user-1', roleId: 'role-2' },
          { userId: 'user-1', roleId: 'role-3' },
        ],
      })
    })
  })
})
