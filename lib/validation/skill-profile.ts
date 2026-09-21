import { z } from 'zod'
import type { EvidenceType } from '@/lib/types/skill-profile'

export const EVIDENCE_TYPES = [
  'ASSESSMENT',
  'PROJECT',
  'CERTIFICATE',
  'INTERNSHIP',
  'ACADEMIC',
  'INDUSTRY',
  'COMPETITION',
  'PORTFOLIO',
] as const satisfies readonly EvidenceType[]

export const evidenceSchema = z
  .object({
    evidenceType: z.enum(EVIDENCE_TYPES),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).default(''),
    url: z.string().trim().url().max(500).or(z.literal('')).default(''),
  })
  .strict()

/**
 * Add-skill input. Authoritative fields (verificationStatus, verifiedBy,
 * verifiedAt) are intentionally NOT part of the schema — the backend owns them.
 */
export const addSkillSchema = z
  .object({
    taxonomyId: z.coerce.number().int().positive(),
    score: z.coerce.number().int().min(0).max(100),
    experienceMonths: z.coerce.number().int().min(0).max(480).default(0),
    evidence: evidenceSchema.optional(),
  })
  .strict()

export const updateSkillSchema = z
  .object({
    score: z.coerce.number().int().min(0).max(100).optional(),
    experienceMonths: z.coerce.number().int().min(0).max(480).optional(),
  })
  .strict()

export const targetRoleSchema = z
  .object({
    roleId: z.coerce.number().int().positive(),
  })
  .strict()

export const skillSearchSchema = z
  .object({
    search: z.string().trim().min(1).max(80).optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict()