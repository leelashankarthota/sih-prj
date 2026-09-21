import { NextResponse } from 'next/server'
import { jsonError, requireStudent } from '@/lib/security'
import { addEvidence, getSkillProfile } from '@/lib/server/skill-profile-service'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ skillId: string }> }) {
  try {
    const { userId } = await requireStudent()
    const { skillId } = await ctx.params
    const id = Number(skillId)
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid skill id.' }, { status: 400 })
    const profile = await getSkillProfile(userId)
    return NextResponse.json({ evidence: profile.evidence.filter((e) => e.studentSkillId === id) })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ skillId: string }> }) {
  try {
    const { userId } = await requireStudent()
    const { skillId } = await ctx.params
    const id = Number(skillId)
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid skill id.' }, { status: 400 })
    const body = await request.json().catch(() => null)
    const result = await addEvidence(userId, id, body)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}