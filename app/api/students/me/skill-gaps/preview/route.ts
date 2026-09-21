import { NextResponse } from 'next/server'
import { jsonError, requireStudent } from '@/lib/security'
import { getSkillGapsPreview } from '@/lib/server/skill-profile-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { userId } = await requireStudent()
    const { skillGaps } = await getSkillGapsPreview(userId)
    return NextResponse.json({ skillGaps })
  } catch (error) {
    return jsonError(error)
  }
}