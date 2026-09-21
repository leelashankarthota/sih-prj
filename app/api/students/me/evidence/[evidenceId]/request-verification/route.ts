import { NextResponse } from 'next/server'
import { jsonError, requireStudent } from '@/lib/security'
import { requestEvidenceVerification } from '@/lib/server/skill-profile-service'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, ctx: { params: Promise<{ evidenceId: string }> }) {
  try {
    const { userId } = await requireStudent()
    const { evidenceId } = await ctx.params
    const id = Number(evidenceId)
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid evidence id.' }, { status: 400 })
    const result = await requestEvidenceVerification(userId, id)
    return NextResponse.json(result)
  } catch (error) {
    return jsonError(error)
  }
}