'use client'

import { useState, useEffect } from 'react'
import { usersApi } from '@/lib/api'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface User {
  id: string
  email: string
  username: string
  displayName: string
  isActive: boolean
  userRoles: any[]
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    usersApi
      .list()
      .then((r) => {
        setUsers(r.data)
        setTotal(r.total)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading)
    return (
      <div className="min-h-64 flex items-center justify-center">
        Loading...
      </div>
    )

  return (
    <div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Manage platform users and their access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Total users: {total}</p>
        </CardContent>
      </Card>

      <div className="bg-card rounded-xl shadow-sm overflow-hidden border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Roles
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-accent/5 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-card-foreground">
                    {u.displayName || u.username}
                  </div>
                  <div className="text-sm text-muted-foreground">{u.email}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1 flex-wrap">
                    {u.userRoles?.map((ur: any) => (
                      <span
                        key={ur.role.id}
                        className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full"
                      >
                        {ur.role.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${u.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}
                  >
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
