'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { authApi } from '@/lib/api';

interface LoginForm { email: string; password: string; }

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'credentials' | 'totp'>('credentials');
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setError('');
    try {
      const res = await authApi.login(data.email, data.password);
      if (res.requiresTwoFactor) {
        setTempToken(res.tempToken);
        setStep('totp');
      } else {
        localStorage.setItem('access_token', res.accessToken);
        localStorage.setItem('refresh_token', res.refreshToken);
        document.cookie = `access_token=${res.accessToken}; path=/; SameSite=Strict`;
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  const onTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await authApi.verifyTotp(tempToken, totpCode);
      localStorage.setItem('access_token', res.accessToken);
      localStorage.setItem('refresh_token', res.refreshToken);
      document.cookie = `access_token=${res.accessToken}; path=/; SameSite=Strict`;
      router.push('/dashboard');
    } catch {
      setError('Invalid 2FA code');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">VoidNull</h1>

        {step === 'credentials' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <h2 className="text-lg font-semibold">Sign In</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                {...register('email', { required: true })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="admin@voidnull.io"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                {...register('password', { required: true })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-4 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {step === 'totp' && (
          <form onSubmit={onTotpSubmit} className="space-y-4">
            <h2 className="text-lg font-semibold">Two-Factor Authentication</h2>
            <p className="text-sm text-gray-500">Enter the 6-digit code from your authenticator app</p>
            <input
              type="text"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-3 py-2 border rounded-md text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="000000"
              maxLength={6}
              autoFocus
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep('credentials')} className="flex-1 py-2 border rounded-md hover:bg-gray-50">Back</button>
              <button type="submit" className="flex-1 py-2 bg-black text-white rounded-md hover:bg-gray-800">Verify</button>
            </div>
          </form>
        )}

        <p className="mt-4 text-xs text-center text-gray-400">
          Demo: admin@voidnull.io / Admin@123456
        </p>
      </div>
    </div>
  );
}
