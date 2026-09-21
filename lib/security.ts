import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { NextResponse } from 'next/server'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  }
  if (error instanceof Error && error.name === 'ZodError') {
    return NextResponse.json({ error: 'Invalid input.' }, { status: 400 })
  }
  if (error instanceof Error && error.message.includes('Unauthorized')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (error instanceof Error && error.message.includes('Forbidden')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  console.error('[skill-profile]', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

/** Current authenticated user (from the session cookie) or null. */
export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

/** Require a logged-in user. */
export async function requireAuth() {
  const user = await getSessionUser()
  if (!user) throw new ApiError(401, 'Unauthorized', 'UNAUTHORIZED')
  return user
}

const STUDENT_ALLOWED_ROLES = ['student', 'admin']

/**
 * Require a student-scoped session. Role is resolved from the authoritative
 * `skill_profiles` row (never from the client). Identity is always derived
 * from the session, never from request payloads.
 */
export async function requireStudent() {
  const user = await requireAuth()
  const result = await pool.query('select role from skill_profiles where user_id = $1 limit 1', [user.id])
  const role = result.rows[0]?.role ?? 'student'
  if (!STUDENT_ALLOWED_ROLES.includes(role)) throw new ApiError(403, 'Forbidden — student access required', 'FORBIDDEN')
  return { userId: user.id, role }
}

/** Append an audit event (never trusts client-provided identity). */
export async function audit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string | number | null = null,
  metadata: Record<string, unknown> = {},
) {
  await pool.query(
    'insert into audit_logs (actor_id, action, entity_type, entity_id, metadata) values ($1,$2,$3,$4,$5)',
    [actorId, action, entityType, entityId === null ? null : String(entityId), JSON.stringify(metadata)],
  )
}