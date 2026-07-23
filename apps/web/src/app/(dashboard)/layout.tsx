'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { connectSocket, disconnectSocket } from '@/lib/socket';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/dashboard/users', label: 'Users', icon: '👥', perm: 'users:list' },
  { href: '/dashboard/roles', label: 'Roles', icon: '🔑', perm: 'roles:list' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      // Prevent redirect loop by checking current path
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      if (pathname !== '/login') {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    const socket = connectSocket();
    socket.on('notification', (data) => console.log('[WS] notification:', data));
    return () => { disconnectSocket(); };
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-sm flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold">VoidNull</h1>
          <p className="text-xs text-gray-500 mt-1">{user.email}</p>
          <div className="flex gap-1 flex-wrap mt-2">
            {user.roles.map((r) => (
              <span key={r} className="text-xs bg-black text-white px-2 py-0.5 rounded-full">{r}</span>
            ))}
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV.filter((n) => !n.perm || hasPermission(n.perm)).map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-gray-100 transition-colors">
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <button onClick={logout} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md">
            🚪 Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
