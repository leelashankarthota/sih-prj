import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getWorkspaceData } from '@/app/actions/skillconnect'
import Dashboard from '@/components/dashboard'

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const data = await getWorkspaceData()
  return <Dashboard user={session.user} initialData={data} />
}
