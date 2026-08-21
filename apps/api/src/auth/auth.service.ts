import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { WalletService } from '../wallet/wallet.service'
import * as bcrypt from 'bcrypt'
import {
  generateSecret,
  generate,
  verify as otpVerify,
  generateURI,
} from 'otplib'
// import * as qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid'
import { RegisterDto } from './dto/register.dto'

type UserWithRoles = {
  id: string
  email: string
  username: string
  is2faEnabled: boolean
  twoFASecret: string | null
  isActive: boolean
  userRoles: Array<{
    role: {
      name: string
      rolePermissions: Array<{ permission: { name: string } }>
    }
  }>
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private redis: RedisService,
    private walletService: WalletService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.findUserWithRoles(email)
    if (!user || !user.isActive) return null
    const valid = await bcrypt.compare(password, (user as any).password)
    return valid ? user : null
  }

  async login(user: UserWithRoles) {
    console.log('authService.login called for user', user)
    let result
    if (user.is2faEnabled) {
      const tempToken = this.jwtService.sign(
        { sub: user.id, type: 'two_factor_pending' },
        {
          secret: this.config.get('jwt.twoFASecret'),
          expiresIn: '5m',
        },
      )
      result = { requiresTwoFactor: true, tempToken }
    } else {
      result = await this.generateTokenPair(user)
    }
    console.log('authService.login result', result)
    return result
  }

  async verifyTwoFactor(tempToken: string, code: string) {
    let payload: { sub: string; type: string }
    try {
      payload = this.jwtService.verify(tempToken, {
        secret: this.config.get('jwt.twoFASecret'),
      })
    } catch {
      throw new UnauthorizedException('Invalid or expired temp token')
    }
    if (payload.type !== 'two_factor_pending') {
      throw new UnauthorizedException('Invalid token type')
    }

    const user = await this.findUserWithRoles(undefined, payload.sub)
    if (!user || !user.twoFASecret) throw new UnauthorizedException()

    const isValid = await otpVerify({ token: code, secret: user.twoFASecret })
    if (!isValid.valid) throw new UnauthorizedException('Invalid 2FA code')

    return this.generateTokenPair(user)
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    })
    if (exists) throw new ConflictException('Email or username already exists')

    const hashed = await bcrypt.hash(dto.password, 12)
    const user = await this.prisma.user.create({
      data: { email: dto.email, username: dto.username, password: hashed },
    })

    await this.walletService.ensureWallet(user.id)

    return { message: 'Registration successful', userId: user.id }
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: { include: { permission: true } },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    })
    return this.generateTokenPair(stored.user as any)
  }

  async logout(userId: string, accessToken: string, refreshToken?: string) {
    // Blacklist access token for its remaining TTL (~15m)
    await this.redis.blacklistToken(accessToken, 900)

    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { token: refreshToken, userId },
        data: { isRevoked: true },
      })
    }
    return { message: 'Logged out successfully' }
  }

  async generateTotpSecret(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new UnauthorizedException()
    if (user.is2faEnabled)
      throw new BadRequestException('2FA is already enabled')

    const secret = generateSecret()
    const otpauthUrl = generateURI({
      issuer: 'VoidNull',
      label: user.email,
      secret,
    })
    const qrCodeUrl = '<placeholder-qr-code>'

    // Store secret temporarily (not enabled until verified)
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFASecret: secret },
    })

    return { secret, qrCodeUrl, otpauthUrl }
  }

  async enableTotp(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user?.twoFASecret)
      throw new BadRequestException('Generate TOTP secret first')

    const isValid = await otpVerify({ token: code, secret: user.twoFASecret })
    if (!isValid.valid) throw new BadRequestException('Invalid TOTP code')

    await this.prisma.user.update({
      where: { id: userId },
      data: { is2faEnabled: true },
    })
    return { message: '2FA enabled successfully' }
  }

  async disableTotp(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user?.twoFASecret || !user.is2faEnabled)
      throw new BadRequestException('2FA is not enabled')

    const isValid = await otpVerify({ token: code, secret: user.twoFASecret })
    if (!isValid.valid) throw new BadRequestException('Invalid TOTP code')

    await this.prisma.user.update({
      where: { id: userId },
      data: { is2faEnabled: false, twoFASecret: null },
    })
    return { message: '2FA disabled successfully' }
  }

  private async findUserWithRoles(
    email?: string,
    id?: string,
  ): Promise<UserWithRoles | null> {
    return this.prisma.user.findFirst({
      where: email ? { email } : { id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    }) as any
  }

  private async generateTokenPair(user: UserWithRoles) {
    const roles = user.userRoles.map((ur) => ur.role.name)
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.name),
        ),
      ),
    ]

    const payload = {
      sub: user.id,
      email: user.email,
      roles,
      permissions,
      type: 'access',
    }

    const accessToken = this.jwtService.sign(payload)
    const refreshTokenValue = uuidv4()

    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      tokenType: 'Bearer',
      access_token: accessToken,
      refresh_token: refreshTokenValue,
      token_type: 'Bearer',
    }
  }
}
