'use client'

import type {
  EvidenceRecord,
  EvidenceType,
  RoleReadinessResult,
  SkillCategory,
  SkillGapItem,
  SkillProfileResponse,
  SkillTaxonomyItem,
} from '@/lib/types/skill-profile'

/**
 * Typed API client for the Student Skill Profile. All identity is resolved
 * server-side from the session cookie; the client never sends user ids.
 */

export class SkillProfileApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message)
    this.name = 'SkillProfileApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    cache: 'no-store',
    headers: init?.body ? { 'content-type': 'application/json', ...(init.headers ?? {}) } : init?.headers,
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new SkillProfileApiError(res.status, body?.error ?? `Request failed (${res.status})`, body?.code)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(path, window.location.origin)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

export interface AddSkillInput {
  taxonomyId: number
  score: number
  experienceMonths?: number
  evidence?: {
    evidenceType: EvidenceType
    title: string
    description?: string
    url?: string
  }
}

export interface EvidenceInput {
  evidenceType: EvidenceType
  title: string
  description?: string
  url?: string
}

function jsonBody(data: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(data) }
}

export const skillProfileApi = {
  profile: {
    get: () => request<SkillProfileResponse>(buildUrl('/api/students/me/skill-profile')),
    download: () => window.open(buildUrl('/api/students/me/profile/download'), '_blank'),
  },
  skills: {
    add: (data: AddSkillInput) => request<{ id: number; evidenceId: number | null }>('/api/students/me/skills', jsonBody(data)),
    update: (skillId: number, data: { score?: number; experienceMonths?: number }) =>
      request<{ ok: boolean }>(`/api/students/me/skills/${skillId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (skillId: number) => request<{ ok: boolean }>(`/api/students/me/skills/${skillId}`, { method: 'DELETE' }),
  },
  evidence: {
    listForSkill: (skillId: number) =>
      request<{ evidence: EvidenceRecord[] }>(buildUrl(`/api/students/me/skills/${skillId}/evidence`)),
    add: (skillId: number, data: EvidenceInput) =>
      request<{ id: number }>(`/api/students/me/skills/${skillId}/evidence`, jsonBody(data)),
    update: (evidenceId: number, data: EvidenceInput) =>
      request<{ ok: boolean }>(`/api/students/me/evidence/${evidenceId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (evidenceId: number) => request<{ ok: boolean }>(`/api/students/me/evidence/${evidenceId}`, { method: 'DELETE' }),
    requestVerification: (evidenceId: number) =>
      request<{ ok: boolean }>(`/api/students/me/evidence/${evidenceId}/request-verification`, { method: 'POST' }),
  },
  roleReadiness: {
    get: () => request<{ targetRoles: RoleReadinessResult[] }>(buildUrl('/api/students/me/role-readiness')),
  },
  skillGaps: {
    preview: () => request<{ skillGaps: SkillGapItem[] }>(buildUrl('/api/students/me/skill-gaps/preview')),
  },
  targetRoles: {
    set: (roleId: number) => request<{ ok: boolean; isPrimary: boolean }>('/api/students/me/target-roles', jsonBody({ roleId })),
    remove: (roleId: number) => request<{ ok: boolean }>(`/api/students/me/target-roles/${roleId}`, { method: 'DELETE' }),
  },
  skillsDirectory: {
    search: (search: string, limit = 10) =>
      request<{ skills: SkillTaxonomyItem[] }>(buildUrl('/api/skills', { search, limit })),
    categories: () => request<{ categories: SkillCategory[] }>(buildUrl('/api/skill-categories')),
    careerRoles: () => request<{ roles: { id: number; name: string; description: string }[] }>(buildUrl('/api/career-roles')),
  },
}

export { request as apiRequest }