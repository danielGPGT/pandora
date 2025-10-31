import { getCurrentUser } from "@/lib/auth/session"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">Welcome back, {user?.first_name || user?.email}</p>
    </div>
  )
}


