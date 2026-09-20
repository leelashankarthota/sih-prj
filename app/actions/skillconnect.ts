'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { z } from 'zod'

const profileSchema = z.object({ headline: z.string().trim().max(120), institution: z.string().trim().max(160), location: z.string().trim().max(120), bio: z.string().trim().max(1000), role: z.enum(['student', 'recruiter', 'academician', 'admin']) })
const skillSchema = z.object({ name: z.string().trim().min(1).max(80), level: z.coerce.number().int().min(0).max(100), evidence: z.string().trim().max(500).optional() })
const opportunitySchema = z.object({ title: z.string().trim().min(2).max(160), company: z.string().trim().min(2).max(160), description: z.string().trim().max(2000).optional(), location: z.string().trim().max(120).optional(), type: z.string().trim().max(40).optional(), requiredSkills: z.array(z.string().trim().max(80)).max(20).optional() })

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

async function requireRole(roles: string[]) {
  const id = await getUserId()
  const result = await pool.query('select role from skill_profiles where user_id=$1 limit 1', [id])
  if (!roles.includes(result.rows[0]?.role ?? 'student')) throw new Error('Forbidden')
  return id
}

export async function getWorkspaceData() {
  const id = await getUserId()
  const [profile, skills, opportunities, applications, learningPaths, assessments, attempts, documents, certificates, notifications, placements, auditLogs] = await Promise.all([
    pool.query('select * from skill_profiles where user_id=$1 order by id desc limit 1', [id]),
    pool.query('select * from skills where user_id=$1 order by updated_at desc', [id]),
    pool.query("select * from opportunities where status='published' order by created_at desc limit 30"),
    pool.query('select * from applications where applicant_id=$1 order by created_at desc', [id]),
    pool.query("select * from learning_paths where status='published' order by case priority when 'priority gap' then 1 when 'next gap' then 2 else 3 end, created_at desc"),
    pool.query("select * from assessments where status='published' order by created_at desc limit 30"),
    pool.query('select * from assessment_attempts where user_id=$1 order by created_at desc', [id]),
    pool.query('select * from documents where user_id=$1 order by created_at desc', [id]),
    pool.query('select * from certificates where user_id=$1 order by issued_at desc', [id]),
    pool.query('select * from notifications where user_id=$1 order by created_at desc limit 20', [id]),
    pool.query('select * from placements where student_id=$1 order by created_at desc', [id]),
    pool.query('select * from audit_logs where actor_id=$1 order by created_at desc limit 50', [id]),
  ])
  return { profile: profile.rows[0] ?? null, skills: skills.rows, opportunities: opportunities.rows, applications: applications.rows, learningPaths: learningPaths.rows, assessments: assessments.rows, attempts: attempts.rows, documents: documents.rows, certificates: certificates.rows, notifications: notifications.rows, placements: placements.rows, auditLogs: auditLogs.rows }
}

export async function saveProfile(input: { headline: string; institution: string; location: string; bio: string; role: string }) {
  const id = await getUserId()
  const values = profileSchema.parse(input)
  await pool.query(`insert into skill_profiles (user_id, headline, institution, location, bio, role) values ($1,$2,$3,$4,$5,$6)
    on conflict (user_id) do update set headline=excluded.headline, institution=excluded.institution, location=excluded.location, bio=excluded.bio, role=excluded.role, updated_at=now()`, [id, values.headline, values.institution, values.location, values.bio, values.role])
  revalidatePath('/')
}

export async function createSkill(input: { name: string; level: number; evidence?: string }) {
  const id = await getUserId(); const values = skillSchema.parse(input)
  await pool.query('insert into skills (user_id,name,level,evidence) values ($1,$2,$3,$4)', [id, values.name, values.level, values.evidence ?? ''])
  revalidatePath('/')
}
export async function updateSkill(input: { id: number; name: string; level: number; evidence?: string }) {
  const id = await getUserId(); const values = skillSchema.parse(input)
  await pool.query('update skills set name=$1,level=$2,evidence=$3,updated_at=now() where id=$4 and user_id=$5', [values.name, values.level, values.evidence ?? '', input.id, id]); revalidatePath('/')
}
export async function deleteSkill(skillId: number) { const id = await getUserId(); await pool.query('delete from skills where id=$1 and user_id=$2', [skillId, id]); revalidatePath('/') }
export async function createOpportunity(input: { title: string; company: string; description?: string; location?: string; type?: string; requiredSkills?: string[] }) { const id = await requireRole(['recruiter','admin']); const values = opportunitySchema.parse(input); await pool.query('insert into opportunities (owner_id,title,company,description,location,opportunity_type,required_skills) values ($1,$2,$3,$4,$5,$6,$7)', [id, values.title, values.company, values.description ?? '', values.location ?? '', values.type ?? 'internship', JSON.stringify(values.requiredSkills ?? [])]); revalidatePath('/') }
export async function deleteOpportunity(opportunityId: number) { const id = await requireRole(['recruiter','admin']); await pool.query('delete from opportunities where id=$1 and owner_id=$2', [opportunityId,id]); revalidatePath('/') }
export async function applyToOpportunity(opportunityId: number, note = '') { const id = await getUserId(); await pool.query('insert into applications (opportunity_id,applicant_id,note) values ($1,$2,$3) on conflict do nothing', [opportunityId,id,note]); revalidatePath('/') }
export async function updateApplication(applicationId: number, status: string) { const id = await getUserId(); await pool.query('update applications set status=$1,updated_at=now() where id=$2 and applicant_id=$3', [status,applicationId,id]); revalidatePath('/') }
export async function deleteApplication(applicationId: number) { const id = await getUserId(); await pool.query('delete from applications where id=$1 and applicant_id=$2', [applicationId,id]); revalidatePath('/') }
export async function submitAssessment(assessmentId: number, score: number) { const id = await getUserId(); const safeScore = z.number().int().min(0).max(100).parse(score); await pool.query("insert into assessment_attempts (assessment_id,user_id,score,status,submitted_at) values ($1,$2,$3,'submitted',now())", [assessmentId, id, safeScore]); await pool.query("insert into audit_logs (actor_id,action,entity_type,entity_id) values ($1,'assessment_submitted','assessment',$2)", [id, assessmentId]); revalidatePath('/') }
export async function createDocument(input: { name: string; documentType: string; url?: string }) { const id = await getUserId(); const values = z.object({ name: z.string().trim().min(1).max(160), documentType: z.string().trim().max(50), url: z.string().trim().max(500).optional() }).parse(input); await pool.query('insert into documents (user_id,name,document_type,url,status) values ($1,$2,$3,$4,\'pending\')', [id, values.name, values.documentType, values.url ?? '']); await pool.query("insert into audit_logs (actor_id,action,entity_type) values ($1,'document_created','document')", [id]); revalidatePath('/') }
export async function markNotificationRead(notificationId: number) { const id = await getUserId(); await pool.query('update notifications set read_at=now() where id=$1 and user_id=$2', [notificationId, id]); revalidatePath('/') }
export async function signOut() { await auth.api.signOut({ headers: await headers() }) }

export type WorkspaceData = Awaited<ReturnType<typeof getWorkspaceData>>

