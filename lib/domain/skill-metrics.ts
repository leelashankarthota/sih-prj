/**
 * Deterministic skill-profile calculations.
 *
 * Every algorithm here is pure (no DB access) so it can be unit-tested and
 * remains traceable: given the same database facts it always produces the same
 * result.
 */
import type { DemandInfo, DemandLevel, NextActionItem, ProfileStrengthComponents, RoleRequirement } from '@/lib/types/skill-profile'

export interface ProficiencyThresholds {
  beginnerMax: number
  intermediateMax: number
  advancedMax: number
}

export const DEFAULT_THRESHOLDS: ProficiencyThresholds = { beginnerMax: 40, intermediateMax: 70, advancedMax: 90 }

/** Score → proficiency level. Mapping is configurable (system_settings). */
export function classifyProficiency(score: number, thresholds: ProficiencyThresholds = DEFAULT_THRESHOLDS): 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' {
  if (score <= thresholds.beginnerMax) return 'Beginner'
  if (score <= thresholds.intermediateMax) return 'Intermediate'
  if (score <= thresholds.advancedMax) return 'Advanced'
  return 'Expert'
}

export interface StudentSkillRef {
  canonicalName: string | null
  score: number
  verificationStatus: string
}

export interface RoleReadiness {
  readiness: number
  matched: string[]
  partial: string[]
  missing: string[]
  perSkill: { skillName: string; requiredLevel: number; weight: number; currentScore: number; coverage: number; verdict: 'matched' | 'partial' | 'missing' }[]
}

/**
 * Deterministic role readiness.
 * coverage = clamp(score / requiredLevel, 0..1)
 * readiness = round( Σ(weight × coverage) / Σ weight × 100 )
 */
export function computeRoleReadiness(requirements: RoleRequirement[], skills: StudentSkillRef[]): RoleReadiness {
  const map = new Map<string, StudentSkillRef>()
  for (const s of skills) if (s.canonicalName) map.set(s.canonicalName.toLowerCase(), s)

  const totalWeight = requirements.reduce((acc, r) => acc + Math.max(1, r.weight), 0)
  let weighted = 0
  const perSkill: RoleReadiness['perSkill'] = []
  const matched: string[] = []
  const partial: string[] = []
  const missing: string[] = []

  for (const req of requirements) {
    const current = map.get(req.skillName.toLowerCase())
    const baseScore = current?.score ?? 0
    const hasSkill = current !== undefined && current.verificationStatus !== 'REJECTED'
    const coverage = hasSkill ? Math.min(1, baseScore / Math.max(1, req.requiredLevel)) : 0
    weighted += Math.max(1, req.weight) * coverage

    const verdict = !hasSkill || baseScore <= 0 ? 'missing' : baseScore >= req.requiredLevel ? 'matched' : 'partial'
    perSkill.push({ skillName: req.skillName, requiredLevel: req.requiredLevel, weight: req.weight, currentScore: hasSkill ? baseScore : 0, coverage, verdict })
    if (verdict === 'matched') matched.push(req.skillName)
    else if (verdict === 'partial') partial.push(req.skillName)
    else missing.push(req.skillName)
  }

  const readiness = totalWeight > 0 ? Math.round((weighted / totalWeight) * 100) : 0
  return { readiness, matched, partial, missing, perSkill }
}

export interface GapCandidate {
  skillId: number
  skillName: string
  currentScore: number
  requiredScore: number
  gap: number
  weight: number
  roleName: string
}

/** Remaining gap for each required skill of a role, with role weights. */
export function computeSkillGaps(
  roleName: string,
  requirements: RoleRequirement[],
  skills: StudentSkillRef[],
): GapCandidate[] {
  const map = new Map<string, StudentSkillRef>()
  for (const s of skills) if (s.canonicalName) map.set(s.canonicalName.toLowerCase(), s)

  const gaps: GapCandidate[] = []
  for (const req of requirements) {
    const current = map.get(req.skillName.toLowerCase())
    const currentScore = current && current.verificationStatus !== 'REJECTED' ? current.score : 0
    const gap = req.requiredLevel - currentScore
    if (gap <= 0) continue
    gaps.push({
      skillId: req.skillId,
      skillName: req.skillName,
      currentScore,
      requiredScore: req.requiredLevel,
      gap,
      weight: req.weight,
      roleName,
    })
  }
  return gaps.sort((a, b) => b.gap * b.weight - a.gap * a.weight)
}

/** Demand level label derived from the actual percentage. */
export function deriveDemandLevel(pct: number | null): DemandLevel {
  if (pct === null) return 'Unavailable'
  if (pct >= 40) return 'High'
  if (pct >= 20) return 'Moderate'
  if (pct >= 10) return 'Low'
  return 'Limited'
}

export function demandInfo(pct: number | null, count: number): DemandInfo {
  if (pct === null || count <= 0) return { level: 'Unavailable', percentage: null, opportunityCount: 0 }
  return { level: deriveDemandLevel(pct), percentage: Math.round(pct * 10) / 10, opportunityCount: count }
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

export interface ProfileStrengthSettings {
  verifiedSkills: number
  assessmentEvidence: number
  projectEvidence: number
  certificateEvidence: number
  internshipEvidence: number
  profileCompleteness: number
  recentActivity: number
}

export const DEFAULT_STRENGTH_WEIGHTS: ProfileStrengthSettings = {
  verifiedSkills: 30,
  assessmentEvidence: 20,
  projectEvidence: 10,
  certificateEvidence: 10,
  internshipEvidence: 10,
  profileCompleteness: 10,
  recentActivity: 10,
}

/** Weighted profile strength. Components are 0-100; weights sum to 100. */
export function computeProfileStrength(components: ProfileStrengthComponents, weights: ProfileStrengthSettings = DEFAULT_STRENGTH_WEIGHTS): number {
  const entries: [keyof ProfileStrengthComponents, keyof ProfileStrengthSettings][] = [
    ['verifiedSkills', 'verifiedSkills'],
    ['assessmentEvidence', 'assessmentEvidence'],
    ['projectEvidence', 'projectEvidence'],
    ['certificateEvidence', 'certificateEvidence'],
    ['internshipEvidence', 'internshipEvidence'],
    ['profileCompleteness', 'profileCompleteness'],
    ['recentActivity', 'recentActivity'],
  ]
  const totalWeight = entries.reduce((acc, [, w]) => acc + Math.max(0, weights[w]), 0)
  if (totalWeight <= 0) return 0
  const weighted = entries.reduce((acc, [c, w]) => acc + clamp(components[c], 0, 100) * Math.max(0, weights[w]), 0)
  return Math.round(weighted / totalWeight)
}

export interface NextActionState {
  totalSkills: number
  targetRoleCount: number
  profileCompleteness: number
  hasSubmittedAssessment: boolean
  selfDeclaredWithoutEvidence: number
  topGap?: { skillName: string; gap: number }
  nextSkills?: string
}

/**
 * Deterministic next-actions generated from the student's actual profile
 * state. Destinations are real routes / in-page targets.
 */
export function generateNextActions(state: NextActionState, nowIso?: string): NextActionItem[] {
  const actions: NextActionItem[] = []
  let id = 0
  const push = (type: NextActionItem['type'], reason: string, destination: string, skillId?: number) => {
    id += 1
    actions.push({ id: `${nowIso ?? 'na'}-${id}`, type, reason, priority: id, destination, skillId })
  }

  if (state.totalSkills === 0) push('ADD_SKILL', 'Your profile has no skills yet — start by adding your strongest skill so the platform can match you.', '#add-skill')
  if (state.targetRoleCount === 0) push('SET_TARGET_ROLE', 'Choosing a target role unlocks role-readiness and gap analysis.', '#target-role')
  if (state.topGap && state.topGap.gap > 10) push('IMPROVE_SKILL', `Close your ${state.topGap.skillName} gap — improving it most increases your role readiness.`, '#add-skill')
  if (state.selfDeclaredWithoutEvidence > 0) push('ADD_EVIDENCE', `${state.selfDeclaredWithoutEvidence} skill${state.selfDeclaredWithoutEvidence > 1 ? 's' : ''} need evidence to move from self-declared toward verified.`, '#evidence')
  if (!state.hasSubmittedAssessment) push('TAKE_ASSESSMENT', 'An assessment produces verified, skill-level scores for your profile.', '/dashboard')
  if (state.profileCompleteness < 60) push('COMPLETE_PROFILE', `Your profile is ${state.profileCompleteness}% complete — add your headline, institution and location.`, '/dashboard/settings')

  return actions.slice(0, 5)
}

/** Verified-skills ratio as a 0-100 component. */
export function verifiedSkillRatio(total: number, verified: number): number {
  if (total <= 0) return 0
  return Math.round((verified / total) * 100)
}

/** Profile completeness from present profile fields (out of 100). */
export function profileCompleteness(fields: (string | unknown | null | undefined)[]): number {
  const present = fields.filter((f) => typeof f === 'string' && f.trim().length > 0)
  if (fields.length === 0) return 0
  return Math.round((present.length / fields.length) * 100)
}