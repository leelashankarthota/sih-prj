import { NextResponse } from 'next/server'
import { jsonError, requireStudent } from '@/lib/security'
import { listCategories } from '@/lib/server/skill-profile-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireStudent()
    const categories = await listCategories()
    return NextResponse.json({ categories })
  } catch (error) {
    return jsonError(error)
  }
}