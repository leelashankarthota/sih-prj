import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { SkillProfilePage } from '@/components/skill-profile/page'

export const metadata = {
  title: 'Skill Profile | SkillConnect',
  description: 'Your DB-driven skill profile: verified skills, role readiness, gaps and industry demand.',
}

export default async function SkillProfileRoute() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  return <SkillProfilePage />
}