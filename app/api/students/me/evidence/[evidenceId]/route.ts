import { NextResponse } from 'next/server'
import { jsonError, requireStudent } from '@/lib/security'
import { removeEvidence, updateEvidence } from '@/lib/server/skill-profile-service'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, ctx: { params: Promise<{ evidenceId: string }> }) {
  try {
    const { userId } = await requireStudent()
    const { evidenceId } = await ctx.params
    const id = Number(evidenceId)
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid evidence id.' }, { status: 400 })
    const body = await request.json().catch(() => null)
    const result = await updateEvidence(userId, id, body)
    return NextResponse.json(result)
  } catch (error) {
    return jsonError(error)
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ evidenceId: string }> }) {
  try {
    const { userId } = await requireStudent()
    const { evidenceId } = await ctx.params
    const id = Number(evidenceId)
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid evidence id.' }, { status: 400 })
    const result = await removeEvidence(userId, id)
    return NextResponse.json(result)
  } catch (error) {
    return jsonError(error)
  }
}