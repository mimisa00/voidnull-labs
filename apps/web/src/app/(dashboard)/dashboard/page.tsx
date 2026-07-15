'use client';
import { useAuth } from '@/hooks/use-auth';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Your Roles" value={user?.roles?.join(', ') || '-'} icon="🔑" />
        <StatCard title="Permissions" value={`${user?.permissions?.length ?? 0} granted`} icon="✅" />
        <StatCard title="2FA Status" value="Check profile" icon="🔒" />
      </div>
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold mb-3">Tech Stack</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['NestJS', 'Next.js 14', 'PostgreSQL', 'Redis', 'Socket.io', 'JWT+TOTP', 'Prisma', 'Turborepo'].map((t) => (
            <span key={t} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md text-sm text-center">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}
