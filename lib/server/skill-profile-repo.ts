import { pool } from '@/lib/db'
import type { SkillTaxonomyItem } from '@/lib/types/skill-profile'

/** Server-only data access for the skill-profile domain. All queries are
 * parameterized and scoped by the authenticated (server-resolved) student id. */

export interface ProfileRow {
  userId: string
  headline: string
  bio: string
  institution: string
  location: string
  role: string
}

export interface SkillRow {
  id: number
  name: string
  level: number
  verified: boolean
  verificationStatus: string
  proficiencyLevel: string
  experienceMonths: number
  source: string
  updatedAt: Date
  taxonomyId: number | null
  categoryId: number | null
  canonicalName: string | null
  categoryName: string | null
  categoryKind: string | null
}

export interface EvidenceRow {
  id: number
  studentSkillId: number
  skillName: string
  evidenceType: string
  title: string
  description: string
  url: string
  verificationStatus: string
  verifiedBy: string | null
  verifiedAt: Date | null
  createdAt: Date
}

export interface AssessmentRow {
  id: number
  assessmentId: number
  title: string
  skillName: string
  score: number
  status: string
  submittedAt: Date | null
}

export interface DemandRow {
  skillId: number
  opportunityCount: number
}

export interface SnapshotRow {
  skillId: number
  period: string
  opportunityCount: number
  percentage: number
}

export interface TargetRoleRow {
  roleId: number
  isPrimary: boolean
  name: string
  description: string
}

export interface RoleRequirementRow {
  roleId: number
  skillId: number
  weight: number
  requiredLevel: number
  canonicalName: string
  categoryName: string | null
}

export function getStudentProfile(userId: string): Promise<ProfileRow | null> {
  return pool
    .query(
      `select user_id as "userId", headline, bio, institution, location, role
       from skill_profiles where user_id = $1`,
      [userId],
    )
    .then((r) => (r.rows[0] as ProfileRow | undefined) ?? null)
}

export async function getActiveSkills(userId: string): Promise<SkillRow[]> {
  const r = await pool.query(
    `select s.id, s.name, s.level, s.verified, s.verification_status as "verificationStatus",
            s.proficiency_level as "proficiencyLevel",
            s.experience_months as "experienceMonths", s.source, s.updated_at as "updatedAt",
            s.taxonomy_id as "taxonomyId", s.category_id as "categoryId",
            t.canonical_name as "canonicalName", c.name as "categoryName", c.kind as "categoryKind"
     from skills s
     left join skill_taxonomy t on t.id = s.taxonomy_id
     left join skill_categories c on c.id = s.category_id
     where s.user_id = $1 and s.is_deleted = false
     order by c.display_order nulls last, s.updated_at desc`,
    [userId],
  )
  return r.rows as unknown as SkillRow[]
}

export async function getEvidenceForSkills(userId: string): Promise<{ rows: EvidenceRow[]; counts: Map<number, number> }> {
  const r = await pool.query(
    `select e.id, e.student_skill_id as "studentSkillId", s.name as "skillName",
            e.evidence_type as "evidenceType", e.title,
            e.description, e.url, e.verification_status as "verificationStatus",
            e.verified_by as "verifiedBy", e.verified_at as "verifiedAt", e.created_at as "createdAt"
     from skill_evidence e
     join skills s on s.id = e.student_skill_id
     where s.user_id = $1 and s.is_deleted = false
     order by e.created_at desc`,
    [userId],
  )
  const rows = r.rows as unknown as EvidenceRow[]
  const counts = new Map<number, number>()
  for (const row of rows) counts.set(row.studentSkillId, (counts.get(row.studentSkillId) ?? 0) + 1)
  return { rows, counts }
}

export async function getAssessmentRecords(userId: string): Promise<AssessmentRow[]> {
  const r = await pool.query(
    `select aa.id, aa.assessment_id as "assessmentId", a.title, a.skill_name as "skillName",
            aa.score, aa.status, aa.submitted_at as "submittedAt"
     from assessment_attempts aa
     join assessments a on a.id = aa.assessment_id
     where aa.user_id = $1 and aa.status = 'submitted'
     order by aa.submitted_at desc nulls last, aa.created_at desc
     limit 10`,
    [userId],
  )
  return r.rows as unknown as AssessmentRow[]
}

export async function getCertificateCount(userId: string): Promise<number> {
  const r = await pool.query('select count(*)::int as n from certificates where user_id = $1', [userId])
  return r.rows[0].n as number
}

export interface CategoryRow {
  id: number
  name: string
  kind: string
  description: string
  displayOrder: number
}

export async function getActiveCategories(): Promise<CategoryRow[]> {
  const r = await pool.query(
    `select id, name, kind, description, display_order as "displayOrder" from skill_categories
     where is_active = true order by display_order, name`,
  )
  return r.rows as unknown as CategoryRow[]
}

export async function searchTaxonomy(search: string, limit: number): Promise<SkillTaxonomyItem[]> {
  const needle = search.trim()
  const r = await pool.query(
    `select t.id, t.name, t.canonical_name as "canonicalName", t.category_id as "categoryId",
            c.name as "categoryName",
            coalesce(array_agg(a.alias) filter (where a.alias is not null), '{}') as aliases
     from skill_taxonomy t
     left join skill_categories c on c.id = t.category_id
     left join skill_aliases a on a.skill_id = t.id
     where t.is_active = true
       and ($1 = '' or t.name ilike $1 || '%' or t.canonical_name ilike $1 || '%'
            or exists (select 1 from skill_aliases x where x.skill_id = t.id and x.alias ilike $1 || '%'))
     group by t.id, t.name, t.canonical_name, t.category_id, c.name
     order by case when t.canonical_name ilike $1 || '%' then 0 else 1 end, t.name
     limit $2`,
    [needle, Math.max(1, Math.min(limit, 50))],
  )
  return r.rows as unknown as SkillTaxonomyItem[]
}

export async function getDemand(): Promise<{ bySkill: Map<number, DemandRow>; total: number }> {
  const [agg, totalR] = await Promise.all([
    pool.query(
      `select t.id as "skillId", count(*)::int as "opportunityCount"
       from opportunities o
       cross join lateral jsonb_array_elements_text(
         case when jsonb_typeof(o.required_skills) = 'array' then o.required_skills else '[]'::jsonb end
       ) req
       join skill_taxonomy t on lower(t.canonical_name) = lower(req) or lower(t.name) = lower(req)
       where o.status = 'published'
         and jsonb_typeof(o.required_skills) = 'array'
         and o.required_skills <> '[]'::jsonb
       group by t.id`,
    ),
    pool.query(`select count(*)::int as total from opportunities where status = 'published'`),
  ])
  const bySkill = new Map<number, DemandRow>()
  for (const row of agg.rows as unknown as DemandRow[]) bySkill.set(row.skillId, row)
  return { bySkill, total: totalR.rows[0].total as number }
}

export async function getDemandSnapshots(skillIds: number[]): Promise<SnapshotRow[]> {
  if (skillIds.length === 0) return []
  const r = await pool.query(
    `select skill_id as "skillId", period, opportunity_count as "opportunityCount", percentage
     from skill_demand_snapshots where skill_id = any($1) order by period`,
    [skillIds],
  )
  return r.rows as unknown as SnapshotRow[]
}

export async function getTargetRoles(userId: string): Promise<TargetRoleRow[]> {
  const r = await pool.query(
    `select str.role_id as "roleId", str.is_primary as "isPrimary", cr.name, cr.description
     from student_target_roles str
     join career_roles cr on cr.id = str.role_id
     where str.student_id = $1
     order by str.is_primary desc, str.created_at asc`,
    [userId],
  )
  return r.rows as unknown as TargetRoleRow[]
}

export async function getRoleRequirements(roleIds: number[]): Promise<RoleRequirementRow[]> {
  if (roleIds.length === 0) return []
  const r = await pool.query(
    `select rs.role_id as "roleId", rs.skill_id as "skillId", rs.weight,
            rs.required_level as "requiredLevel", t.canonical_name as "canonicalName",
            c.name as "categoryName"
     from role_skills rs
     join skill_taxonomy t on t.id = rs.skill_id
     left join skill_categories c on c.id = t.category_id
     where rs.role_id = any($1)`,
    [roleIds],
  )
  return r.rows as unknown as RoleRequirementRow[]
}

export async function getCareerRoles(): Promise<{ id: number; name: string; description: string }[]> {
  const r = await pool.query(`select id, name, description from career_roles where is_active = true order by name`)
  return r.rows as unknown as { id: number; name: string; description: string }[]
}

export async function getSettings(keys: string[]): Promise<Map<string, unknown>> {
  if (keys.length === 0) return new Map()
  const r = await pool.query(`select key, value from system_settings where key = any($1)`, [keys])
  const map = new Map<string, unknown>()
  for (const row of r.rows as unknown as { key: string; value: unknown }[]) map.set(row.key, row.value)
  return map
}

export async function taxonomyById(id: number): Promise<{ id: number; name: string; canonicalName: string; categoryId: number } | null> {
  const r = await pool.query(
    `select id, name, canonical_name as "canonicalName", category_id as "categoryId" from skill_taxonomy where id = $1 and is_active = true`,
    [id],
  )
  return (r.rows[0] as { id: number; name: string; canonicalName: string; categoryId: number } | undefined) ?? null
}