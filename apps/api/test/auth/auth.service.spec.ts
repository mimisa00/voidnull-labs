// otplib 的傳遞依賴 @scure/base 是 ESM-only, jest CJS runtime 無法載入;
// 本 spec 測的 login 路徑(is2faEnabled: false)不觸及 TOTP 函式, 以 factory mock 隔開
jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generate: jest.fn(),
  verify: jest.fn(),
  generateURI: jest.fn(),
}))

import { AuthService } from '../../src/auth/auth.service'

describe('AuthService', () => {
  let service: AuthService
  let mockPrisma: any
  let mockJwt: any
  let mockConfig: any
  let mockRedis: any
  let mockWallet: any

  beforeEach(() => {
    // 建立 mock 依賴,直接實例化 AuthService
    mockPrisma = {
      user: { findFirst: jest.fn() },
      refreshToken: { create: jest.fn().mockResolvedValue({}) },
    }
    mockJwt = {
      sign: jest.fn().mockReturnValue('signed-access-token'),
      verify: jest.fn(),
    }
    mockConfig = { get: jest.fn() }
    mockRedis = { blacklistToken: jest.fn() }
    mockWallet = { ensureWallet: jest.fn() }

    service = new AuthService(
      mockPrisma,
      mockJwt,
      mockConfig,
      mockRedis,
      mockWallet,
    )
  })

  describe('generateTokenPair (via login)', () => {
    it('should deduplicate role names when a user has duplicated UserRole rows', async () => {
      // 歷史重複 UserRole 行(同 role name)不得在 JWT payload 中變成重複 roles,
      // 否則前端會顯示 N 個同名 chip,且 permissions 也會被放大
      const user = {
        id: 'user-1',
        email: 'admin@voidnull.io',
        username: 'admin',
        is2faEnabled: false,
        twoFASecret: null,
        isActive: true,
        userRoles: [
          {
            role: {
              name: 'admin',
              rolePermissions: [
                { permission: { name: 'users:list' } },
                { permission: { name: 'users:read' } },
              ],
            },
          },
          {
            role: {
              name: 'admin',
              rolePermissions: [
                { permission: { name: 'users:list' } },
                { permission: { name: 'users:read' } },
              ],
            },
          },
        ],
      }

      const result = await service.login(user as any)

      expect(result.accessToken).toBe('signed-access-token')
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-1',
          roles: ['admin'],
          permissions: ['users:list', 'users:read'],
        }),
      )
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1)
    })

    it('should keep distinct role names in the JWT payload', async () => {
      const user = {
        id: 'user-2',
        email: 'user@voidnull.io',
        username: 'user',
        is2faEnabled: false,
        twoFASecret: null,
        isActive: true,
        userRoles: [
          {
            role: {
              name: 'user',
              rolePermissions: [{ permission: { name: 'games:play' } }],
            },
          },
          {
            role: {
              name: 'admin',
              rolePermissions: [{ permission: { name: 'users:list' } }],
            },
          },
        ],
      }

      await service.login(user as any)

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: ['user', 'admin'],
          permissions: ['games:play', 'users:list'],
        }),
      )
    })
  })
})
