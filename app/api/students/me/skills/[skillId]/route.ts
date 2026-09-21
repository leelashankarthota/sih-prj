import { NextResponse } from 'next/server'
import { jsonError, requireStudent } from '@/lib/security'
import { removeStudentSkill, updateStudentSkill } from '@/lib/server/skill-profile-service'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, ctx: { params: Promise<{ skillId: string }> }) {
  try {
    const { userId } = await requireStudent()
    const { skillId } = await ctx.params
    const id = Number(skillId)
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid skill id.' }, { status: 400 })
    const body = await request.json().catch(() => null)
    const result = await updateStudentSkill(userId, id, body)
    return NextResponse.json(result)
  } catch (error) {
    return jsonError(error)
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ skillId: string }> }) {
  try {
    const { userId } = await requireStudent()
    const { skillId } = await ctx.params
    const id = Number(skillId)
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid skill id.' }, { status: 400 })
    const result = await removeStudentSkill(userId, id)
    return NextResponse.json(result)
  } catch (error) {
    return jsonError(error)
  }
}