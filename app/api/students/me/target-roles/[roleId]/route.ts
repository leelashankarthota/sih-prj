import { NextResponse } from 'next/server'
import { jsonError, requireStudent } from '@/lib/security'
import { removeTargetRole } from '@/lib/server/skill-profile-service'

export const dynamic = 'force-dynamic'

export async function DELETE(_request: Request, ctx: { params: Promise<{ roleId: string }> }) {
  try {
    const { userId } = await requireStudent()
    const { roleId } = await ctx.params
    const id = Number(roleId)
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid role id.' }, { status: 400 })
    const result = await removeTargetRole(userId, id)
    return NextResponse.json(result)
  } catch (error) {
    return jsonError(error)
  }
}