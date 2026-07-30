"use client"

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Your Roles</CardTitle>
            <CardDescription>Assigned roles and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{user?.roles?.join(', ') || '-'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
            <CardDescription>Granted permissions count</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{user?.permissions?.length ?? 0} granted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2FA Status</CardTitle>
            <CardDescription>Two-factor authentication status</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">Check profile</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tech Stack</CardTitle>
          <CardDescription>Platform technologies and tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['NestJS', 'Next.js 14', 'PostgreSQL', 'Redis', 'Socket.io', 'JWT+TOTP', 'Prisma', 'Turborepo'].map((t) => (
              <span key={t} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm text-center hover:bg-gray-200 transition-colors">
                {t}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
