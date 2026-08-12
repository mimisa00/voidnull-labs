import { PermissionsGuard } from '../../src/rbac/guards/permissions.guard'
import { Reflector } from '@nestjs/core'
import { ForbiddenException } from '@nestjs/common'

function mockExecutionContext(user: any) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => () => {},
    getClass: () => class Dummy {},
  } as any
}

class TestReflector extends Reflector {
  constructor(private readonly value: any) {
    super()
  }
  getAllAndOverride<T>(key: string, target: any[]): T | undefined {
    return this.value as unknown as T
  }
}

describe('PermissionsGuard', () => {
  it('allows when no permissions required', () => {
    const guard = new PermissionsGuard(new TestReflector(null))
    const ctx = mockExecutionContext({ permissions: ['view'] })
    expect(guard.canActivate(ctx)).toBe(true)
  })

  it('allows if user has all required permissions', () => {
    const guard = new PermissionsGuard(new TestReflector(['create', 'delete']))
    const ctx = mockExecutionContext({
      permissions: ['create', 'delete', 'edit'],
    })
    expect(guard.canActivate(ctx)).toBe(true)
  })

  it('throws ForbiddenException when user lacks a required permission', () => {
    const guard = new PermissionsGuard(new TestReflector(['update']))
    const ctx = mockExecutionContext({ permissions: ['create'] })
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException)
  })

  it('throws ForbiddenException when no user context', () => {
    const guard = new PermissionsGuard(new TestReflector(['read']))
    const ctx = mockExecutionContext(null as any)
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException)
  })
})
