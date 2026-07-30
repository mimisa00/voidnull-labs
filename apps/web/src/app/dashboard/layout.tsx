'use client';
import { useEffect, useState } from 'react';
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
      {/* Sidebar */}
      <aside className={`bg-white shadow-sm flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-4 border-b">
          {!sidebarCollapsed && (
            <>
              <h1 className="text-xl font-bold text-gold">VoidNull</h1>
              <p className="text-xs text-gray-500 mt-1">{user.email}</p>
              <div className="flex gap-1 flex-wrap mt-2">
                {user.roles.map((r) => (
                  <span key={r} className="text-xs bg-gold text-white px-2 py-0.5 rounded-full">{r}</span>
                ))}
              </div>
            </>
          )}
          {sidebarCollapsed && (
            <div className="flex justify-center">
              <span className="text-gold text-xl">VN</span>
            </div>
          )}
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {NAV.filter((n) => !n.perm || hasPermission(n.perm)).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-gray-100 transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
            >
              <span>{item.icon}</span>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-2 border-t">
          <button
            onClick={logout}
            className={`w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors ${sidebarCollapsed ? 'flex justify-center' : ''}`}
          >
            {!sidebarCollapsed ? '🚪 Logout' : '🚪'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-md hover:bg-gray-200 transition-colors"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}
