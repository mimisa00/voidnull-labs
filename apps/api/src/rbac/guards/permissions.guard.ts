import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator'
import { JwtPayload } from '../../auth/decorators/current-user.decorator'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    )
    if (!required?.length) return true

    const user: JwtPayload = context.switchToHttp().getRequest().user
    if (!user) throw new ForbiddenException('No user context')

    const hasAll = required.every((perm) => user.permissions?.includes(perm))
    if (!hasAll) throw new ForbiddenException('Insufficient permissions')
    return true
  }
}
