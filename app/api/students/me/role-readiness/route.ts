import { NextResponse } from 'next/server'
import { jsonError, requireStudent } from '@/lib/security'
import { getRoleReadiness } from '@/lib/server/skill-profile-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { userId } = await requireStudent()
    const targetRoles = await getRoleReadiness(userId)
    return NextResponse.json({ targetRoles })
  } catch (error) {
    return jsonError(error)
  }
}