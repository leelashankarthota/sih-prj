import { NextResponse } from 'next/server'
import { jsonError, requireStudent } from '@/lib/security'
import { listCareerRoles } from '@/lib/server/skill-profile-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireStudent()
    const roles = await listCareerRoles()
    return NextResponse.json({ roles })
  } catch (error) {
    return jsonError(error)
  }
}