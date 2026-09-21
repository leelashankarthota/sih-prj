import { NextResponse } from 'next/server'
import { jsonError, requireStudent } from '@/lib/security'
import { searchSkills } from '@/lib/server/skill-profile-service'
import { skillSearchSchema } from '@/lib/validation/skill-profile'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireStudent()
    const parsed = skillSearchSchema.parse(Object.fromEntries(new URL(request.url).searchParams))
    const results = await searchSkills(parsed.search ?? '', parsed.limit)
    return NextResponse.json({ skills: results })
  } catch (error) {
    return jsonError(error)
  }
}