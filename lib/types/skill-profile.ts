/**
 * Shared, DB-driven contract for the Student Skill Profile. Every value is
 * computed server-side from database records; these types describe the API
 * shape and are used by both the typed client and the server service.
 */

export type VerificationStatus =
  | 'SELF_DECLARED'
  | 'ASSESSED'
  | 'EVIDENCE_SUPPORTED'
  | 'VERIFIED'
  | 'EXPIRED'
  | 'REJECTED'

export type EvidenceStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

export type EvidenceType =
  | 'ASSESSMENT'
  | 'PROJECT'
  | 'CERTIFICATE'
  | 'INTERNSHIP'
  | 'ACADEMIC'
  | 'INDUSTRY'
  | 'COMPETITION'
  | 'PORTFOLIO'

export type ProficiencyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'

export type DemandLevel = 'High' | 'Moderate' | 'Low' | 'Limited' | 'Unavailable'

export interface SkillCategory {
  id: number
  name: string
  kind: 'technical' | 'soft'
  description: string
  displayOrder: number
}

export interface SkillTaxonomyItem {
  id: number
  name: string
  canonicalName: string
  categoryId: number
  categoryName: string
  aliases: string[]
}

export interface DemandInfo {
  level: DemandLevel
  percentage: number | null
  opportunityCount: number
}

export interface DemandTrend {
  direction: 'up' | 'down' | 'flat'
  from: number
  to: number
}

export interface StudentSkill {
  id: number
  taxonomyId: number | null
  categoryId: number | null
  categoryName: string | null
  name: string
  canonicalName: string | null
  score: number
  proficiencyLevel: ProficiencyLevel
  verificationStatus: VerificationStatus
  verified: boolean
  experienceMonths: number
  evidenceCount: number
  demand: DemandInfo
  demandTrend: DemandTrend | null
  lastUpdatedAt: string
  source: string
}

export interface EvidenceRecord {
  id: number
  studentSkillId: number
  skillName: string
  evidenceType: EvidenceType
  title: string
  description: string
  url: string
  verificationStatus: EvidenceStatus
  verifiedBy: string | null
  verifiedAt: string | null
  createdAt: string
}

export interface AssessmentRecord {
  id: number
  assessmentId: number
  title: string
  skillName: string
  score: number
  status: string
  submittedAt: string | null
}

export interface RoleRequirement {
  skillId: number
  skillName: string
  categoryName: string | null
  requiredLevel: number
  weight: number
}

export interface RoleReadinessResult {
  roleId: number
  roleName: string
  roleDescription: string
  isPrimary: boolean
  readiness: number
  requiredSkills: RoleRequirement[]
  matched: string[]
  partial: string[]
  missing: string[]
}

export interface SkillGapItem {
  skillId: number
  skillName: string
  currentScore: number
  requiredScore: number
  gap: number
  roleName: string
  demand: DemandInfo
  weight: number
}

export type NextActionType =
  | 'ADD_SKILL'
  | 'SET_TARGET_ROLE'
  | 'IMPROVE_SKILL'
  | 'ADD_EVIDENCE'
  | 'TAKE_ASSESSMENT'
  | 'COMPLETE_PROFILE'
  | 'ADD_PROJECT'

export interface NextActionItem {
  id: string
  type: NextActionType
  reason: string
  priority: number
  destination: string
  skillId?: number
}

export interface ProfileStrengthComponents {
  verifiedSkills: number
  assessmentEvidence: number
  projectEvidence: number
  certificateEvidence: number
  internshipEvidence: number
  profileCompleteness: number
  recentActivity: number
}

export interface ProfileStrengthResult {
  score: number
  components: ProfileStrengthComponents
}

export interface PortfolioSummary {
  projectCount: number
  certificateCount: number
  internshipCount: number
  achievementCount: number
  verifiedSkillCount: number
}

export interface IndustryDemandEntry {
  skillId: number
  name: string
  level: DemandLevel
  percentage: number | null
  opportunityCount: number
  trend: DemandTrend | null
}

export interface SkillProfileResponse {
  profile: {
    headline: string
    bio: string
    institution: string
    location: string
    role: string
  }
  profileStrength: ProfileStrengthResult
  profileCompleteness: number
  summary: {
    totalSkills: number
    verifiedSkills: number
    developingSkills: number
    needsEvidence: number
    technicalAverage: number | null
    softSkillAverage: number | null
    industryAlignment: number | null
  }
  categories: SkillCategory[]
  skills: StudentSkill[]
  evidence: EvidenceRecord[]
  assessments: AssessmentRecord[]
  latestAssessment: AssessmentRecord | null
  industryDemand: IndustryDemandEntry[]
  skillGaps: SkillGapItem[]
  targetRoles: RoleReadinessResult[]
  nextActions: NextActionItem[]
  portfolio: PortfolioSummary
  updatedAt: string
}

export interface RoleReadinessResponse {
  targetRoles: RoleReadinessResult[]
}

export interface SkillGapPreviewResponse {
  skillGaps: SkillGapItem[]
}