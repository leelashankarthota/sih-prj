import { NextResponse } from 'next/server'
import { jsonError, requireStudent } from '@/lib/security'
import { addStudentSkill } from '@/lib/server/skill-profile-service'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { userId } = await requireStudent()
    const body = await request.json().catch(() => null)
    const result = await addStudentSkill(userId, body)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}