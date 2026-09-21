import { pool } from '@/lib/db'
import { ApiError } from '@/lib/security'
import * as repo from '@/lib/server/skill-profile-repo'
import {
  classifyProficiency,
  computeProfileStrength,
  computeRoleReadiness,
  computeSkillGaps,
  DEFAULT_STRENGTH_WEIGHTS,
  DEFAULT_THRESHOLDS,
  demandInfo,
  generateNextActions,
  profileCompleteness,
  type ProfileStrengthSettings,
  type ProficiencyThresholds,
} from '@/lib/domain/skill-metrics'
import type {
  AssessmentRecord,
  DemandTrend,
  EvidenceRecord,
  EvidenceType,
  IndustryDemandEntry,
  NextActionItem,
  PortfolioSummary,
  ProfileStrengthResult,
  RoleReadinessResult,
  RoleRequirement,
  SkillCategory,
  SkillGapPreviewResponse,
  SkillGapItem,
  SkillProfileResponse,
  SkillTaxonomyItem,
  StudentSkill,
} from '@/lib/types/skill-profile'
import { addSkillSchema, evidenceSchema, targetRoleSchema, updateSkillSchema } from '@/lib/validation/skill-profile'
import type { z } from 'zod'

const SEVEN_THIRTY = 730 // evidence / profile strength recency window

function iso(d: Date | string | null | undefined): string | null {
  if (!d) return null
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString()
}

interface ProfileConfig {
  weights: ProfileStrengthSettings
  thresholds: ProficiencyThresholds
}

async function loadConfig(): Promise<ProfileConfig> {
  const settings = await repo.getSettings(['profile_strength_weights', 'proficiency_thresholds'])
  const weights = (settings.get('profile_strength_weights') ?? DEFAULT_STRENGTH_WEIGHTS) as unknown as ProfileStrengthSettings
  const thresholds = (settings.get('proficiency_thresholds') ?? DEFAULT_THRESHOLDS) as unknown as ProficiencyThresholds
  return { weights, thresholds }
}

function toEvidence(row: repo.EvidenceRow): EvidenceRecord {
  return {
    id: row.id,
    studentSkillId: row.studentSkillId,
    skillName: row.skillName,
    evidenceType: row.evidenceType as EvidenceType,
    title: row.title,
    description: row.description,
    url: row.url,
    verificationStatus: row.verificationStatus as EvidenceRecord['verificationStatus'],
    verifiedBy: row.verifiedBy,
    verifiedAt: iso(row.verifiedAt),
    createdAt: iso(row.createdAt) ?? '',
  }
}

function toAssessment(row: repo.AssessmentRow): AssessmentRecord {
  return {
    id: row.id,
    assessmentId: row.assessmentId,
    title: row.title,
    skillName: row.skillName,
    score: row.score,
    status: row.status,
    submittedAt: iso(row.submittedAt),
  }
}

function demandFor(taxonomyId: number | null, demand: { bySkill: Map<number, repo.DemandRow>; total: number }) {
  if (taxonomyId === null || demand.total <= 0) return demandInfo(null, 0)
  const d = demand.bySkill.get(taxonomyId)
  if (!d || d.opportunityCount <= 0) return demandInfo(null, 0)
  return demandInfo((d.opportunityCount / demand.total) * 100, d.opportunityCount)
}

function trendFor(taxonomyId: number | null, snapshots: repo.SnapshotRow[]): DemandTrend | null {
  if (taxonomyId === null) return null
  const rows = snapshots.filter((s) => s.skillId === taxonomyId).sort((a, b) => a.period.localeCompare(b.period))
  if (rows.length < 2) return null
  const latest = rows[rows.length - 1]
  const previous = rows[rows.length - 2]
  const from = Number(previous.percentage)
  const to = Number(latest.percentage)
  return { from, to, direction: to - from >= 1 ? 'up' : to - from <= -1 ? 'down' : 'flat' }
}

/** Full Skill Profile aggregate — the single source of truth for the page. */
export async function getSkillProfile(userId: string): Promise<SkillProfileResponse> {
  const [studentProfile, skills, evidence, assessments, certificateCount, categories, demand, targetRoles, config] =
    await Promise.all([
      repo.getStudentProfile(userId),
      repo.getActiveSkills(userId),
      repo.getEvidenceForSkills(userId),
      repo.getAssessmentRecords(userId),
      repo.getCertificateCount(userId),
      repo.getActiveCategories(),
      repo.getDemand(),
      repo.getTargetRoles(userId),
      loadConfig(),
    ])

  const skillRefs = skills.map((s) => ({
    canonicalName: s.canonicalName,
    score: s.level,
    verificationStatus: s.verificationStatus,
  }))

  const requirementRows =
    targetRoles.length > 0 ? await repo.getRoleRequirements(targetRoles.map((t) => t.roleId)) : []

  const requirementsByRole = new Map<number, repo.RoleRequirementRow[]>()
  for (const row of requirementRows) {
    const list = requirementsByRole.get(row.roleId) ?? []
    list.push(row)
    requirementsByRole.set(row.roleId, list)
  }

  const taxonomyIds = skills.map((s) => s.taxonomyId).filter((v): v is number => v !== null)
  const snapshots = await repo.getDemandSnapshots(taxonomyIds)

  // ---- profile strength components -------------------------------------------------
  const totalSkills = skills.length
  const verifiedCount = skills.filter((s) => s.verificationStatus === 'VERIFIED').length
  const latestAssessment = assessments.length > 0 ? toAssessment(assessments[0]) : null
  const projectEvidenceSkills = new Set(evidence.rows.filter((e) => e.evidenceType === 'PROJECT').map((e) => e.studentSkillId))
  const internshipEvidenceSkills = new Set(evidence.rows.filter((e) => e.evidenceType === 'INTERNSHIP').map((e) => e.studentSkillId))
  const recentCutoff = new Date(Date.now() - SEVEN_THIRTY * 24 * 60 * 60 * 1000)
  const recentRecords = skills.filter((s) => s.updatedAt >= recentCutoff)

  const components = {
    verifiedSkills: totalSkills > 0 ? Math.round((verifiedCount / totalSkills) * 100) : 0,
    assessmentEvidence: latestAssessment ? Math.min(100, latestAssessment.score) : 0,
    projectEvidence: totalSkills > 0 ? Math.round((projectEvidenceSkills.size / totalSkills) * 100) : 0,
    certificateEvidence: Math.min(100, Math.round((certificateCount / Math.max(1, totalSkills)) * 100)),
    internshipEvidence: totalSkills > 0 ? Math.round((internshipEvidenceSkills.size / totalSkills) * 100) : 0,
    profileCompleteness: profileCompleteness([
      studentProfile?.headline ?? '',
      studentProfile?.bio ?? '',
      studentProfile?.institution ?? '',
      studentProfile?.location ?? '',
    ]),
    recentActivity: totalSkills > 0 ? Math.round((recentRecords.length / totalSkills) * 100) : 0,
  }
  const profileStrength: ProfileStrengthResult = {
    score: computeProfileStrength(components, config.weights),
    components,
  }

  // ---- summary ---------------------------------------------------------------------
  const technicalSkills = skills.filter((s) => s.categoryKind === 'technical')
  const softSkills = skills.filter((s) => s.categoryKind === 'soft')
  const technicalAverage = technicalSkills.length > 0 ? Math.round(technicalSkills.reduce((a, s) => a + s.level, 0) / technicalSkills.length) : null
  const softSkillAverage = softSkills.length > 0 ? Math.round(softSkills.reduce((a, s) => a + s.level, 0) / softSkills.length) : null
  const alignmentParts = skills
    .map((s) => demandFor(s.taxonomyId, demand).percentage)
    .filter((p): p is number => p !== null)
  const industryAlignment = alignmentParts.length > 0 ? Math.round(alignmentParts.reduce((a, b) => a + b, 0) / alignmentParts.length) : null

  const skillList: StudentSkill[] = skills.map((s) => {
    const demandInfo = demandFor(s.taxonomyId, demand)
    return {
      id: s.id,
      taxonomyId: s.taxonomyId,
      categoryId: s.categoryId,
      categoryName: s.categoryName,
      name: s.name,
      canonicalName: s.canonicalName,
      score: s.level,
      proficiencyLevel: (s.proficiencyLevel as StudentSkill['proficiencyLevel']) ?? classifyProficiency(s.level, config.thresholds),
      verificationStatus: s.verificationStatus as StudentSkill['verificationStatus'],
      verified: s.verificationStatus === 'VERIFIED',
      experienceMonths: s.experienceMonths,
      evidenceCount: evidence.counts.get(s.id) ?? 0,
      demand: demandInfo,
      demandTrend: trendFor(s.taxonomyId, snapshots),
      lastUpdatedAt: iso(s.updatedAt) ?? '',
      source: s.source,
    }
  })

  // ---- target roles + readiness -----------------------------------------------------
  const targetRoleResults: RoleReadinessResult[] = targetRoles.map((t) => {
    const requirements = (requirementsByRole.get(t.roleId) ?? []).map((r) => ({
      skillId: r.skillId,
      skillName: r.canonicalName,
      categoryName: r.categoryName,
      requiredLevel: r.requiredLevel,
      weight: r.weight,
    }))
    const readiness = computeRoleReadiness(requirements, skillRefs)
    return {
      roleId: t.roleId,
      roleName: t.name,
      roleDescription: t.description,
      isPrimary: t.isPrimary,
      readiness: readiness.readiness,
      requiredSkills: requirements,
      matched: readiness.matched,
      partial: readiness.partial,
      missing: readiness.missing,
    }
  })

  // ---- skill gaps -------------------------------------------------------------------
  const toRequirements = (rows: repo.RoleRequirementRow[]): RoleRequirement[] =>
    rows.map((r) => ({
      skillId: r.skillId,
      skillName: r.canonicalName,
      categoryName: r.categoryName,
      requiredLevel: r.requiredLevel,
      weight: r.weight,
    }))
  const gapCandidates = targetRoles.flatMap((t) =>
    computeSkillGaps(t.name, toRequirements(requirementsByRole.get(t.roleId) ?? []), skillRefs),
  )
  const seenGaps = new Set<number>()
  const gaps: SkillGapItem[] = gapCandidates
    .filter((g) => (seenGaps.has(g.skillId) ? false : (seenGaps.add(g.skillId), true)))
    .slice(0, 4)
    .map((g) => ({ ...g, demand: demandFor(g.skillId, demand) }))

  // ---- next actions -------------------------------------------------------------------
  const selfDeclaredWithoutEvidence = skills.filter(
    (s) => s.verificationStatus === 'SELF_DECLARED' && (evidence.counts.get(s.id) ?? 0) === 0,
  ).length
  const nextActions: NextActionItem[] = generateNextActions({
    totalSkills,
    targetRoleCount: targetRoles.length,
    profileCompleteness: components.profileCompleteness,
    hasSubmittedAssessment: assessments.length > 0,
    selfDeclaredWithoutEvidence,
    topGap: gaps.find((g) => g.gap > 10),
  })

  // ---- portfolio ----------------------------------------------------------------------
  const evidenceRows = evidence.rows
  const portfolio: PortfolioSummary = {
    projectCount: evidenceRows.filter((e) => e.evidenceType === 'PROJECT').length,
    certificateCount,
    internshipCount: evidenceRows.filter((e) => e.evidenceType === 'INTERNSHIP').length,
    achievementCount: evidenceRows.filter((e) => e.evidenceType === 'COMPETITION' || e.evidenceType === 'ACADEMIC').length,
    verifiedSkillCount: verifiedCount,
  }

  const industryDemand: IndustryDemandEntry[] = skills
    .filter((s) => s.taxonomyId !== null)
    .map((s) => {
      const d = demandFor(s.taxonomyId, demand)
      return {
        skillId: s.taxonomyId as number,
        name: s.canonicalName ?? s.name,
        level: d.level,
        percentage: d.percentage,
        opportunityCount: d.opportunityCount,
        trend: trendFor(s.taxonomyId, snapshots),
      }
    })

  const updatedAtRaw = skills.reduce<Date | null>((acc, s) => (acc && acc >= s.updatedAt ? acc : s.updatedAt), null)

  return {
    profile: {
      headline: studentProfile?.headline ?? '',
      bio: studentProfile?.bio ?? '',
      institution: studentProfile?.institution ?? '',
      location: studentProfile?.location ?? '',
      role: studentProfile?.role ?? 'student',
    },
    profileStrength,
    profileCompleteness: components.profileCompleteness,
    summary: {
      totalSkills,
      verifiedSkills: verifiedCount,
      developingSkills: skills.filter((s) => s.level < config.thresholds.advancedMax).length,
      needsEvidence: selfDeclaredWithoutEvidence,
      technicalAverage,
      softSkillAverage,
      industryAlignment,
    },
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind as 'technical' | 'soft',
      description: c.description,
      displayOrder: c.displayOrder,
    })) satisfies SkillCategory[],
    skills: skillList,
    evidence: evidence.rows.map(toEvidence),
    assessments: assessments.map(toAssessment),
    latestAssessment,
    industryDemand,
    skillGaps: gaps,
    targetRoles: targetRoleResults,
    nextActions,
    portfolio,
    updatedAt: iso(updatedAtRaw) ?? new Date().toISOString(),
  }
}

export function getRoleReadiness(userId: string): Promise<RoleReadinessResult[]> {
  return getSkillProfile(userId).then((p) => p.targetRoles)
}

export function getSkillGapsPreview(userId: string): Promise<SkillGapPreviewResponse> {
  return getSkillProfile(userId).then((p) => ({ skillGaps: p.skillGaps }))
}

// -------------------------------------------------------------------------------------
// Lookups
// -------------------------------------------------------------------------------------

export async function searchSkills(search: string, limit = 20): Promise<SkillTaxonomyItem[]> {
  if (!search.trim()) return []
  return repo.searchTaxonomy(search, limit)
}

export function listCategories(): Promise<SkillCategory[]> {
  return repo.getActiveCategories().then((rows) =>
    rows.map((c) => ({ id: c.id, name: c.name, kind: c.kind as 'technical' | 'soft', description: c.description, displayOrder: c.displayOrder })),
  )
}

export function listCareerRoles() {
  return repo.getCareerRoles()
}

export async function getTaxonomySkill(id: number) {
  return repo.taxonomyById(id)
}

// -------------------------------------------------------------------------------------
// Mutations
// -------------------------------------------------------------------------------------

type UpdateSkillInput = z.infer<typeof updateSkillSchema>

export async function addStudentSkill(userId: string, rawInput: unknown) {
  const input = addSkillSchema.parse(rawInput)
  const taxonomy = await repo.taxonomyById(input.taxonomyId)
  if (!taxonomy) throw new ApiError(400, 'Unknown skill', 'UNKNOWN_SKILL')

  const { thresholds } = await loadConfig()
  const client = await pool.connect()
  try {
    await client.query('begin')
    const existing = await client.query(
      `select id from skills where user_id = $1 and taxonomy_id = $2 and is_deleted = false for update`,
      [userId, input.taxonomyId],
    )
    if (existing.rows[0]) throw new ApiError(409, 'This skill is already on your profile.', 'DUPLICATE_SKILL')

    const verificationStatus = input.evidence ? 'EVIDENCE_SUPPORTED' : 'SELF_DECLARED'
    const inserted = await client.query(
      `insert into skills (user_id, name, level, verified, evidence, category_id, taxonomy_id,
                           proficiency_level, verification_status, experience_months, source)
       values ($1,$2,$3,false,'',$4,$5,$6,$7,$8,'manual')
       returning id`,
      [userId, taxonomy.name, input.score, taxonomy.categoryId, taxonomy.id, classifyProficiency(input.score, thresholds), verificationStatus, input.experienceMonths],
    )
    const skillId = inserted.rows[0].id as number
    let evidenceId: number | null = null
    if (input.evidence) {
      const ev = await client.query(
        `insert into skill_evidence (student_skill_id, evidence_type, title, description, url, verification_status)
         values ($1,$2,$3,$4,$5,'PENDING') returning id`,
        [skillId, input.evidence.evidenceType, input.evidence.title, input.evidence.description, input.evidence.url],
      )
      evidenceId = ev.rows[0].id as number
    }
    await client.query(
      `insert into audit_logs (actor_id, action, entity_type, entity_id, metadata) values ($1,'SKILL_ADDED','skill',$2,$3)`,
      [userId, skillId, JSON.stringify({ taxonomyId: taxonomy.id, score: input.score })],
    )
    if (evidenceId !== null) {
      await client.query(
        `insert into audit_logs (actor_id, action, entity_type, entity_id, metadata) values ($1,'EVIDENCE_ADDED','evidence',$2,$3)`,
        [userId, evidenceId, JSON.stringify({ type: input.evidence!.evidenceType })],
      )
    }
    await client.query('commit')
    return { id: skillId, evidenceId }
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    client.release()
  }
}

export async function updateStudentSkill(userId: string, skillId: number, rawInput: unknown) {
  const input = updateSkillSchema.parse(rawInput) as UpdateSkillInput
  if (input.score === undefined && input.experienceMonths === undefined) {
    throw new ApiError(400, 'Nothing to update.', 'EMPTY_UPDATE')
  }
  const { thresholds } = await loadConfig()
  const client = await pool.connect()
  try {
    await client.query('begin')
    const row = await client.query(
      `select id, level, experience_months from skills where id = $1 and user_id = $2 and is_deleted = false for update`,
      [skillId, userId],
    )
    if (!row.rows[0]) throw new ApiError(404, 'Skill not found.', 'NOT_FOUND')

    const score = input.score ?? (row.rows[0].level as number)
    const experienceMonths = input.experienceMonths ?? (row.rows[0].experience_months as number)
    await client.query(
      `update skills set level = $1, proficiency_level = $2, experience_months = $3, updated_at = now()
       where id = $4 and user_id = $5`,
      [score, classifyProficiency(score, thresholds), experienceMonths, skillId, userId],
    )
    await client.query(
      `insert into audit_logs (actor_id, action, entity_type, entity_id, metadata) values ($1,'SKILL_UPDATED','skill',$2,$3)`,
      [userId, skillId, JSON.stringify(input)],
    )
    await client.query('commit')
    return { ok: true }
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    client.release()
  }
}

export async function removeStudentSkill(userId: string, skillId: number) {
  const client = await pool.connect()
  try {
    await client.query('begin')
    const row = await client.query(`select id from skills where id = $1 and user_id = $2 and is_deleted = false for update`, [skillId, userId])
    if (!row.rows[0]) throw new ApiError(404, 'Skill not found.', 'NOT_FOUND')
    await client.query(`update skills set is_deleted = true, updated_at = now() where id = $1 and user_id = $2`, [skillId, userId])
    await client.query(`insert into audit_logs (actor_id, action, entity_type, entity_id) values ($1,'SKILL_REMOVED','skill',$2)`, [userId, skillId])
    await client.query('commit')
    return { ok: true }
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    client.release()
  }
}

export async function addEvidence(userId: string, skillId: number, rawInput: unknown) {
  const input = evidenceSchema.parse(rawInput)
  const client = await pool.connect()
  try {
    await client.query('begin')
    const skill = await client.query(
      `select id, verification_status from skills where id = $1 and user_id = $2 and is_deleted = false for update`,
      [skillId, userId],
    )
    if (!skill.rows[0]) throw new ApiError(404, 'Skill not found.', 'NOT_FOUND')
    const ev = await client.query(
      `insert into skill_evidence (student_skill_id, evidence_type, title, description, url, verification_status)
       values ($1,$2,$3,$4,$5,'PENDING') returning id`,
      [skillId, input.evidenceType, input.title, input.description, input.url],
    )
    if (skill.rows[0].verification_status === 'SELF_DECLARED') {
      await client.query(`update skills set verification_status = 'EVIDENCE_SUPPORTED', updated_at = now() where id = $1`, [skillId])
    }
    await client.query(
      `insert into audit_logs (actor_id, action, entity_type, entity_id) values ($1,'EVIDENCE_ADDED','evidence',$2)`,
      [userId, ev.rows[0].id],
    )
    await client.query('commit')
    return { id: ev.rows[0].id as number }
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    client.release()
  }
}

export async function updateEvidence(userId: string, evidenceId: number, rawInput: unknown) {
  const input = evidenceSchema.parse(rawInput)
  const client = await pool.connect()
  try {
    await client.query('begin')
    const row = await client.query(
      `select e.id from skill_evidence e join skills s on s.id = e.student_skill_id
       where e.id = $1 and s.user_id = $2 and s.is_deleted = false for update`,
      [evidenceId, userId],
    )
    if (!row.rows[0]) throw new ApiError(404, 'Evidence not found.', 'NOT_FOUND')
    await client.query(
      `update skill_evidence set evidence_type = $1, title = $2, description = $3, url = $4, updated_at = now() where id = $5`,
      [input.evidenceType, input.title, input.description, input.url, evidenceId],
    )
    await client.query(`insert into audit_logs (actor_id, action, entity_type, entity_id) values ($1,'EVIDENCE_UPDATED','evidence',$2)`, [userId, evidenceId])
    await client.query('commit')
    return { ok: true }
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    client.release()
  }
}

export async function removeEvidence(userId: string, evidenceId: number) {
  const client = await pool.connect()
  try {
    await client.query('begin')
    const row = await client.query(
      `select e.id, e.student_skill_id from skill_evidence e join skills s on s.id = e.student_skill_id
       where e.id = $1 and s.user_id = $2 and s.is_deleted = false for update`,
      [evidenceId, userId],
    )
    if (!row.rows[0]) throw new ApiError(404, 'Evidence not found.', 'NOT_FOUND')
    await client.query(`delete from skill_evidence where id = $1`, [evidenceId])
    const remaining = await client.query(`select count(*)::int as n from skill_evidence where student_skill_id = $1`, [row.rows[0].student_skill_id])
    if (remaining.rows[0].n === 0) {
      await client.query(`update skills set verification_status = 'SELF_DECLARED', updated_at = now() where id = $1 and verification_status = 'EVIDENCE_SUPPORTED'`, [row.rows[0].student_skill_id])
    }
    await client.query(`insert into audit_logs (actor_id, action, entity_type, entity_id) values ($1,'EVIDENCE_REMOVED','evidence',$2)`, [userId, evidenceId])
    await client.query('commit')
    return { ok: true }
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    client.release()
  }
}

export async function requestEvidenceVerification(userId: string, evidenceId: number) {
  const client = await pool.connect()
  try {
    await client.query('begin')
    const row = await client.query(
      `select e.id from skill_evidence e join skills s on s.id = e.student_skill_id
       where e.id = $1 and s.user_id = $2 and s.is_deleted = false for update`,
      [evidenceId, userId],
    )
    if (!row.rows[0]) throw new ApiError(404, 'Evidence not found.', 'NOT_FOUND')
    await client.query(`update skill_evidence set verification_status = 'PENDING', updated_at = now() where id = $1`, [evidenceId])
    await client.query(
      `insert into audit_logs (actor_id, action, entity_type, entity_id) values ($1,'EVIDENCE_VERIFICATION_REQUESTED','evidence',$2)`,
      [userId, evidenceId],
    )
    await client.query('commit')
    return { ok: true }
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    client.release()
  }
}

export async function setTargetRole(userId: string, rawInput: unknown) {
  const { roleId } = targetRoleSchema.parse(rawInput)
  const client = await pool.connect()
  try {
    await client.query('begin')
    const active = await client.query(`select id from career_roles where id = $1 and is_active = true`, [roleId])
    if (!active.rows[0]) throw new ApiError(400, 'Unknown role.', 'UNKNOWN_ROLE')
    const existing = await client.query(`select id from student_target_roles where student_id = $1`, [userId])
    const isPrimary = existing.rowCount === 0
    await client.query(
      `insert into student_target_roles (student_id, role_id, is_primary)
       values ($1,$2,$3)
       on conflict (student_id, role_id) do update set is_primary = excluded.is_primary, updated_at = now()`,
      [userId, roleId, isPrimary],
    )
    if (isPrimary) {
      await client.query(`update student_target_roles set is_primary = false where student_id = $1 and role_id <> $2`, [userId, roleId])
    }
    await client.query(`insert into audit_logs (actor_id, action, entity_type, entity_id) values ($1,'TARGET_ROLE_SET','career_role',$2)`, [userId, roleId])
    await client.query('commit')
    return { ok: true, isPrimary }
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    client.release()
  }
}

export async function removeTargetRole(userId: string, roleId: number) {
  await pool.query('delete from student_target_roles where student_id = $1 and role_id = $2', [userId, roleId])
  await pool.query(`insert into audit_logs (actor_id, action, entity_type, entity_id) values ($1,'TARGET_ROLE_REMOVED','career_role',$2)`, [userId, roleId])
  return { ok: true }
}