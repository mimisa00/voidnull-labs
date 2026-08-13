'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

interface LoginForm { email: string; password: string }

// Helper to determine redirect path based on permissions
function getRedirectPath(permissions: string[]): string {
  if (permissions.includes('operations:read')) {
    return '/operations/dashboard'
  }
  if (permissions.includes('games:read')) {
    return '/games/lobby'
  }
  if (permissions.includes('client:read')) {
    return '/client/home'
  }
  return '/dashboard'
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'credentials' | 'totp'>('credentials');
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setError('')
    try {
      const res = await authApi.login(data.email, data.password)
      if (res.requiresTwoFactor) {
        setTempToken(res.tempToken)
        setStep('totp')
      } else {
        // Write to both cookie and localStorage
        document.cookie = 'access_token=' + encodeURIComponent(res.accessToken!) + '; path=/; SameSite=Lax;'
        document.cookie = 'refresh_token=' + encodeURIComponent(res.refreshToken!) + '; path=/; SameSite=Lax;'
        localStorage.setItem('access_token', res.accessToken!)
        localStorage.setItem('refresh_token', res.refreshToken!)

        // Let middleware handle the redirect based on permissions in the token
        // Redirect to /dashboard which middleware will rewrite based on permissions
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed')
    }
  }

  const onTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await authApi.verifyTotp(tempToken, totpCode)
      // Write to both cookie and localStorage
      document.cookie = 'access_token=' + encodeURIComponent(res.accessToken!) + '; path=/; SameSite=Lax;'
      document.cookie = 'refresh_token=' + encodeURIComponent(res.refreshToken!) + '; path=/; SameSite=Lax;'
      localStorage.setItem('access_token', res.accessToken!)
      localStorage.setItem('refresh_token', res.refreshToken!)

      // Let middleware handle the redirect based on permissions in the token
      // Redirect to /dashboard which middleware will rewrite based on permissions
      router.push('/dashboard')
    } catch {
      setError('Invalid 2FA code')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gold mb-2">VoidNull</h1>
          <p className="text-gray-500">Secure Platform Access</p>
        </div>

        {step === 'credentials' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input
                type="email"
                {...register('email', { required: true })}
                placeholder="admin@voidnull.io"
                className="py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <Input
                type="password"
                {...register('password', { required: true })}
                placeholder="••••••••"
                className="py-2"
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 bg-gold hover:bg-goldDark text-white rounded-md transition-colors"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        )}

        {step === 'totp' && (
          <form onSubmit={onTotpSubmit} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-center mb-2">Two-Factor Authentication</h2>
              <p className="text-sm text-gray-500 text-center mb-4">Enter the 6-digit code from your authenticator app</p>
              <Input
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full py-3 text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
                maxLength={6}
                autoFocus
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setStep('credentials')}
                variant="outline"
                className="flex-1 py-2"
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1 py-2 bg-gold hover:bg-goldDark text-white rounded-md transition-colors"
              >
                Verify
              </Button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-center text-gray-400">
            Demo: admin@voidnull.io / Admin@123456
          </p>
        </div>
      </div>
    </div>
  );
}
