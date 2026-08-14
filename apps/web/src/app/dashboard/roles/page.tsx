'use client'

import { useAuth } from '@/hooks/use-auth'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function RolesPage() {
  const { user } = useAuth()

  return (
    <div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>
            Manage platform roles and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Total roles: {user?.roles?.length ?? 0}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {user?.roles?.map((role) => (
          <Card key={role} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="capitalize text-card-foreground">
                {role}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Role details and permissions
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
