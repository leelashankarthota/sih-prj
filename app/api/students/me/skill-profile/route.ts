import { NextResponse } from 'next/server'
import { jsonError, requireStudent } from '@/lib/security'
import { getSkillProfile } from '@/lib/server/skill-profile-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { userId } = await requireStudent()
    const profile = await getSkillProfile(userId)
    return NextResponse.json(profile)
  } catch (error) {
    return jsonError(error)
  }
}