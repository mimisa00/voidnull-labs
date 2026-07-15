'use client';
import { useState, useEffect } from 'react';
import { rolesApi } from '@/lib/api';

interface Permission { id: string; name: string; resource: string; action: string; }
interface Role { id: string; name: string; description: string; rolePermissions: { permission: Permission }[] }

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rolesApi.list().then((r) => setRoles(r)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Roles <span className="text-gray-400 text-sm font-normal">({roles.length})</span></h2>
      </div>
      <div className="space-y-4">
        {roles.map((role) => (
          <div key={role.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-lg capitalize">{role.name}</h3>
                {role.description && <p className="text-sm text-gray-500 mt-0.5">{role.description}</p>}
              </div>
              <span className="text-xs text-gray-400">{role.rolePermissions?.length ?? 0} permissions</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {role.rolePermissions?.map(({ permission: p }) => (
                <span key={p.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p.name}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
