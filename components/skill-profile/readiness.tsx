'use client'

import { useState } from 'react'
import { ArrowUpRight, Check, CircleMinus, Target, Trash2, X, Plus } from 'lucide-react'
import { SkillProfileApiError, skillProfileApi } from '@/lib/api/client'
import type { RoleReadinessResult, SkillProfileResponse } from '@/lib/types/skill-profile'
import { Badge, Card, EmptyState, ProgressBar, SectionHeader, demandTone } from '@/components/skill-profile/ui'

function verdictTone(verdict: string) {
  return verdict === 'matched' ? 'verified' : verdict === 'partial' ? 'pending' : 'rejected'
}

export function ReadinessSection({ profile }: { profile: SkillProfileResponse }) {
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <section id="target-role" className="scroll-mt-24">
      <Card>
        <SectionHeader
          eyebrow="Career readiness"
          title="Target roles & readiness"
          subtitle="Readiness is computed deterministically from your skill scores against each role's weighted requirements."
          action={
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#17213a] px-3.5 py-2.5 text-xs font-semibold text-white"
            >
              {pickerOpen ? <X size={14} /> : <Plus size={14} />} {pickerOpen ? 'Close' : 'Choose target role'}
            </button>
          }
        />

        {pickerOpen && <RolePicker profile={profile} onClose={() => setPickerOpen(false)} />}

        {profile.targetRoles.length === 0 ? (
          <EmptyState title="No target role selected" hint="Choose a target role to unlock readiness scoring, skill-gap analysis and personalized next actions." />
        ) : (
          <div className="flex flex-col gap-4">
            {profile.targetRoles.map((role) => (
              <RoleCard key={role.roleId} role={role} />
            ))}
          </div>
        )}

        <GapsPreview profile={profile} />
      </Card>
    </section>
  )
}

function RoleCard({ role }: { role: RoleReadinessResult }) {
  return (
    <div className="rounded-xl border border-[#edf0f4] p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-[#17213a]">{role.roleName}</h4>
            {role.isPrimary && <Badge tone="pending">Primary focus</Badge>}
          </div>
          <p className="mt-1 text-[11px] leading-5 text-[#8a94a6]">{role.roleDescription || 'Target role'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-36">
            <p className="mb-1 text-right text-[11px] font-semibold text-[#17213a]">{role.readiness}% ready</p>
            <ProgressBar value={role.readiness} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Meter label="Matched" count={role.matched.length} tone="verified">
          {role.matched.slice(0, 4).map((s) => (
            <Chip key={s} tone="verified">{s}</Chip>
          ))}
        </Meter>
        <Meter label="Developing" count={role.partial.length} tone="pending">
          {role.partial.slice(0, 4).map((s) => (
            <Chip key={s} tone="pending">{s}</Chip>
          ))}
        </Meter>
        <Meter label="Missing" count={role.missing.length} tone="rejected">
          {role.missing.slice(0, 4).map((s) => (
            <Chip key={s} tone="rejected">{s}</Chip>
          ))}
        </Meter>
      </div>

      {role.requiredSkills.length > 0 && (
        <div className="mt-4 border-t border-[#edf0f4] pt-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#8a94a6]">Requirements</p>
          <div className="flex flex-wrap gap-1.5">
            {role.requiredSkills.map((req) => (
              <span
                key={req.skillId}
                className="inline-flex items-center gap-1 rounded-full bg-[#f4f6fa] px-2 py-1 text-[10px] text-[#6e798d]"
                title={`Required ${req.requiredLevel}/100 · weight ${req.weight}`}
              >
                {req.skillName} <span className="font-semibold text-[#3959d8]">{req.requiredLevel}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Meter({ label, count, tone, children }: { label: string; count: number; tone: 'verified' | 'pending' | 'rejected'; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-[#f7f8fb] p-3">
      <p className="text-[11px] font-semibold text-[#17213a]">{label} · {count}</p>
      {count === 0 ? (
        <p className="mt-1 text-[10px] text-[#9aa3b3]">None</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1">{children}</div>
      )}
    </div>
  )
}

function Chip({ tone, children }: { tone: 'verified' | 'pending' | 'rejected'; children: React.ReactNode }) {
  const icons = {
    verified: <Check size={10} />,
    pending: <CircleMinus size={10} />,
    rejected: <X size={10} />,
  }
  const cls = {
    verified: 'bg-[#eaf6f1] text-[#2c9d78]',
    pending: 'bg-[#fff5df] text-[#aa7822]',
    rejected: 'bg-[#fdecec] text-[#d36b6b]',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cls[tone]}`}>
      {icons[tone]} {children}
    </span>
  )
}

function GapsPreview({ profile }: { profile: SkillProfileResponse }) {
  if (profile.skillGaps.length === 0) return null
  return (
    <div className="mt-6 border-t border-[#edf0f4] pt-5">
      <p className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.14em] text-[#8a94a6]">
        <Target size={12} className="text-[#3959d8]" /> Highest-priority gaps
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {profile.skillGaps.map((gap) => (
          <li key={gap.skillId} className="flex items-center justify-between gap-3 rounded-lg border border-[#edf0f4] px-3 py-2">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[#17213a]">{gap.skillName}</p>
              <p className="text-[10px] text-[#8a94a6]">
                {gap.roleName} · need {gap.requiredScore}, have {gap.currentScore}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge tone={demandTone(gap.demand.level)}>{gap.demand.level} demand</Badge>
              <span className="text-[12px] font-bold text-[#d36b6b]">-{gap.gap}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RolePicker({ profile, onClose }: { profile: SkillProfileResponse; onClose: () => void }) {
  const [roles, setRoles] = useState<{ id: number; name: string; description: string }[]>(profile.targetRoles.map((r) => ({ id: r.roleId, name: r.roleName, description: r.roleDescription })))
  const [loading, setLoading] = useState(roles.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const selected = new Set(profile.targetRoles.map((r) => r.roleId))

  if (loading) {
    void skillProfileApi.skillsDirectory
      .careerRoles()
      .then(({ roles }) => {
        setRoles(roles)
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof SkillProfileApiError ? err.message : 'Could not load roles')
        setLoading(false)
      })
  }

  async function choose(roleId: number) {
    setBusyId(roleId)
    try {
      await skillProfileApi.targetRoles.set(roleId)
      onClose()
      window.location.reload()
    } catch (err) {
      setError(err instanceof SkillProfileApiError ? err.message : 'Could not add role')
      setBusyId(null)
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-[#3959d8]/30 bg-[#fafbff] p-4">
      <p className="text-[11px] font-semibold text-[#17213a]">Choose a target role</p>
      {error && <p className="mt-2 text-[11px] font-medium text-[#d36b6b]">{error}</p>}
      {loading ? (
        <p className="mt-3 text-[11px] text-[#8a94a6]">Loading career catalogue…</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {roles.map((role) => (
            <li key={role.id}>
              <button
                disabled={selected.has(role.id) || busyId === role.id}
                onClick={() => void choose(role.id)}
                className="flex w-full items-center justify-between rounded-lg border border-[#e6eaf0] bg-white px-3 py-2 text-left hover:border-[#3959d8] disabled:opacity-40"
              >
                <span className="text-[12px] font-medium text-[#17213a]">{role.name}</span>
                {selected.has(role.id) ? (
                  <Badge tone="verified">Selected</Badge>
                ) : busyId === role.id ? (
                  <span className="text-[10px] text-[#8a94a6]">Adding…</span>
                ) : (
                  <ArrowUpRight size={13} className="text-[#3959d8]" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}