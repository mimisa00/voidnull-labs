import { RolesGuard } from '../../src/rbac/guards/roles.guard'
import { Reflector } from '@nestjs/core'
import { ForbiddenException } from '@nestjs/common'

// Helper to create a minimal ExecutionContext for testing.
function mockExecutionContext(user: any, handler?: any, clazz?: any) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => handler ?? (() => {}),
    getClass: () => clazz ?? class Dummy {},
  } as any
}

// Mock Reflector that returns predefined required roles.
class TestReflector extends Reflector {
  constructor(private readonly value: any) {
    super()
  }
  getAllAndOverride<T>(key: string, target: any[]): T | undefined {
    return this.value as unknown as T
  }
}

describe('RolesGuard', () => {
  it('allows when no roles required', () => {
    const guard = new RolesGuard(new TestReflector(null))
    const ctx = mockExecutionContext({ roles: ['master'] })
    expect(guard.canActivate(ctx)).toBe(true)
  })

  it('allows if user has one of the required roles', () => {
    const guard = new RolesGuard(
      new TestReflector(['branch-manager', 'cage-staff']),
    )
    const ctx = mockExecutionContext({ roles: ['cage-staff'] })
    expect(guard.canActivate(ctx)).toBe(true)
  })

  it('throws ForbiddenException when user lacks required role', () => {
    const guard = new RolesGuard(new TestReflector(['agent']))
    const ctx = mockExecutionContext({ roles: ['cage-staff'] })
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException)
  })

  it('throws ForbiddenException when no user context', () => {
    const guard = new RolesGuard(new TestReflector(['agent']))
    const ctx = mockExecutionContext(null as any, undefined, undefined)
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException)
  })
})
