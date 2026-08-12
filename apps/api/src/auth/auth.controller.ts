import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  Request,
  Res,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { LocalAuthGuard } from './guards/local-auth.guard'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { CurrentUser, JwtPayload } from './decorators/current-user.decorator'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import {
  VerifyTotpDto,
  EnableTotpDto,
  RefreshTokenDto,
} from './dto/verify-totp.dto'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Login with email + password' })
  async login(@Body() _dto: LoginDto, @Request() req, @Res() res) {
    console.log('Login controller called with body:', _dto, 'user:', req.user)
    const result = await this.authService.login(req.user)
    return res.status(200).json(result)
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new account' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete login with TOTP code' })
  async verifyTwoFactor(@Body() dto: VerifyTotpDto) {
    return this.authService.verifyTwoFactor(dto.tempToken, dto.code)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken)
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke tokens' })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Request() req,
    @Body() body: { refreshToken?: string },
  ) {
    const token = req.headers.authorization?.split(' ')[1]
    return this.authService.logout(user.sub, token, body.refreshToken)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info from JWT' })
  async me(@CurrentUser() user: JwtPayload) {
    return user
  }

  @Get('2fa/generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate TOTP secret + QR code' })
  async generateTotp(@CurrentUser() user: JwtPayload) {
    return this.authService.generateTotpSecret(user.sub)
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable 2FA after scanning QR code' })
  async enableTotp(
    @CurrentUser() user: JwtPayload,
    @Body() dto: EnableTotpDto,
  ) {
    return this.authService.enableTotp(user.sub, dto.code)
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable 2FA' })
  async disableTotp(
    @CurrentUser() user: JwtPayload,
    @Body() dto: EnableTotpDto,
  ) {
    return this.authService.disableTotp(user.sub, dto.code)
  }
}
