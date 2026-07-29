"use client"

import { useAuth } from '@/hooks/use-auth';

export default function RolesPage() {
  const { user } = useAuth();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Roles <span className="text-gray-400 text-sm font-normal">({user?.roles?.length ?? 0})</span></h2>
      </div>
      <div className="space-y-4">
        {user?.roles?.map((role) => (
          <div key={role} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-lg capitalize">{role}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
