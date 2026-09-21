'use client'

import { ArrowDownRight, ArrowUpRight, ArrowRight, ChevronRight, Download, Lightbulb, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { skillProfileApi } from '@/lib/api/client'
import type { NextActionItem, SkillProfileResponse } from '@/lib/types/skill-profile'
import { Badge, Card, EmptyState, ProgressBar, demandTone } from '@/components/skill-profile/ui'

const COMPONENT_LABELS: { key: keyof SkillProfileResponse['profileStrength']['components']; label: string }[] = [
  { key: 'verifiedSkills', label: 'Verified skills' },
  { key: 'assessmentEvidence', label: 'Assessment evidence' },
  { key: 'projectEvidence', label: 'Projects' },
  { key: 'certificateEvidence', label: 'Certificates' },
  { key: 'internshipEvidence', label: 'Internships' },
  { key: 'profileCompleteness', label: 'Profile completeness' },
  { key: 'recentActivity', label: 'Recent activity' },
]

export function SidePanel({ profile, onChange, notify }: { profile: SkillProfileResponse; onChange: () => void; notify: (m: string) => void }) {
  return (
    <aside className="space-y-6">
      <StrengthCard profile={profile} />
      <NextActionsCard actions={profile.nextActions} />
      <DemandCard profile={profile} />
    </aside>
  )
}

function StrengthCard({ profile }: { profile: SkillProfileResponse }) {
  const { score, components } = profile.profileStrength
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-[#17213a]">Profile strength</h3>
        <span className="rounded-full bg-[#eef1ff] px-2.5 py-1 text-[11px] font-bold text-[#3959d8]">{score}/100</span>
      </div>
      <div className="mt-3">
        <ProgressBar value={score} className="h-3" />
      </div>
      <ul className="mt-5 flex flex-col gap-3">
        {COMPONENT_LABELS.map(({ key, label }) => (
          <li key={key}>
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="text-[#6e798d]">{label}</span>
              <span className="font-semibold text-[#17213a]">{components[key]}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#edf0f5]">
              <div className="h-full rounded-full bg-[#3959d8]" style={{ width: `${Math.min(100, components[key])}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[10px] leading-5 text-[#9aa3b3]">Weighted by your configured profile-strength rules; verified evidence contributes most.</p>
    </Card>
  )
}

const ACTION_ICON: Record<NextActionItem['type'], React.ReactNode> = {
  ADD_SKILL: <PlusInline />,
  SET_TARGET_ROLE: <TargetInline />,
  IMPROVE_SKILL: <ArrowUpRight size={14} />,
  ADD_EVIDENCE: <ShieldInline />,
  TAKE_ASSESSMENT: <ClipInline />,
  COMPLETE_PROFILE: <UserInline />,
  ADD_PROJECT: <FolderInline />,
}

function NextActionsCard({ actions }: { actions: NextActionItem[] }) {
  if (actions.length === 0) return null
  return (
    <Card>
      <div className="flex items-center gap-2">
        <Lightbulb size={15} className="text-[#aa7822]" />
        <h3 className="text-[15px] font-semibold text-[#17213a]">Suggested next actions</h3>
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {actions.map((action) => (
          <li key={action.id}>
            <a
              href={action.destination}
              onClick={(e) => {
                if (action.destination.startsWith('#')) {
                  e.preventDefault()
                  document.getElementById(action.destination.slice(1))?.scrollIntoView({ behavior: 'smooth' })
                }
              }}
              className="flex items-start gap-3 rounded-xl border border-[#edf0f4] bg-[#fafbff] p-3 transition-colors hover:border-[#3959d8]/40"
            >
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[#eef1ff] text-[#3959d8]">
                {ACTION_ICON[action.type]}
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold text-[#17213a]">{action.type.replaceAll('_', ' ').toLowerCase()}</span>
                <span className="mt-0.5 block text-[11px] leading-5 text-[#788397]">{action.reason}</span>
              </span>
              <ChevronRight size={14} className="ml-auto mt-1 shrink-0 text-[#9aa3b3]" />
            </a>
          </li>
        ))}
      </ul>
      <button
        onClick={() => skillProfileApi.profile.download()}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#e6eaf0] px-3 py-2.5 text-xs font-semibold text-[#6e798d] hover:bg-[#f7f8fa]"
      >
        <Download size={13} /> Download printable profile
      </button>
    </Card>
  )
}

function DemandCard({ profile }: { profile: SkillProfileResponse }) {
  const top = [...profile.industryDemand]
    .filter((d) => d.level !== 'Unavailable')
    .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0))
    .slice(0, 8)
  return (
    <Card>
      <h3 className="text-[15px] font-semibold text-[#17213a]">Industry demand signal</h3>
      <p className="mt-1 text-[11px] leading-5 text-[#8a94a6]">
        Demand is derived from your skills' share of published opportunities. Trends use recorded snapshots.
      </p>
      {top.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No demand data" hint="Add skills to see how they match live opportunity demand." />
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {top.map((d) => (
            <li key={d.skillId}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-[#17213a]">{d.name}</p>
                  <p className="text-[10px] text-[#8a94a6]">
                    {d.opportunityCount} opportunity{d.opportunityCount === 1 ? '' : 's'}
                    {d.trend && <Trend trend={d.trend.direction} />}
                  </p>
                </div>
                <Badge tone={demandTone(d.level)}>{d.percentage !== null ? `${d.percentage}%` : d.level}</Badge>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#edf0f5]">
                <div className="h-full rounded-full bg-[#3959d8]" style={{ width: `${Math.min(100, d.percentage ?? 0) * 2.5}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-[10px] text-[#9aa3b3]">Percentages reflect share of published opportunities, not market figures.</p>
    </Card>
  )
}

function Trend({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  const map = {
    up: <TrendingUp size={11} className="text-[#2c9d78]" />,
    down: <TrendingDown size={11} className="text-[#d36b6b]" />,
    flat: <Minus size={11} className="text-[#9aa3b3]" />,
  }
  return <span className="ml-1 inline-flex items-center text-[#8a94a6]">{map[trend]} <ArrowRight size={0} /></span>
}

// ---- tiny icon helpers (avoid extra imports in the map above) ----
function PlusInline() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
  )
}
function TargetInline() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.5" fill="currentColor" /></svg>
  )
}
function ShieldInline() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3z" /></svg>
  )
}
function ClipInline() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="3" width="12" height="18" rx="2" /><path d="M10 3v2m4-2v2" /></svg>
  )
}
function UserInline() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></svg>
  )
}
function FolderInline() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7a2 2 0 012-2h4l2 3h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
  )
}