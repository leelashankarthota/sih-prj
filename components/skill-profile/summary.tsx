'use client'

import { Award, ClipboardCheck, GraduationCap, ListChecks, Sparkles } from 'lucide-react'
import type { SkillProfileResponse } from '@/lib/types/skill-profile'
import { Card } from '@/components/skill-profile/ui'

type NavTarget = 'skills' | 'target-role' | 'evidence'

function Stat({ label, value, sub, onClick, accent = false }: { label: string; value: string | number; sub?: string; onClick?: () => void; accent?: boolean }) {
  return (
    <button onClick={onClick} className="text-left">
      <Card className={accent ? 'border-[#3959d8]/40' : ''}>
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-[#7d8798]">{label}</p>
          <Sparkles size={14} className={accent ? 'text-[#3959d8]' : 'text-[#c6cdd9]'} />
        </div>
        <p className="mt-4 text-[28px] font-semibold text-[#17213a]">{value}</p>
        {sub && <p className="mt-1 text-[10px] font-medium text-[#2c9d78]">{sub} →</p>}
      </Card>
    </button>
  )
}

export function SummaryCards({ profile, onNavigate }: { profile: SkillProfileResponse; onNavigate: (id: NavTarget) => void }) {
  const { summary, profileStrength } = profile
  const avg = (profile.skills.length ? Math.round(profile.skills.reduce((a, s) => a + s.score, 0) / profile.skills.length) : 0)
  return (
    <section aria-label="Profile summary">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Profile strength" value={`${profileStrength.score}/100`} sub="Weighted score" onClick={() => onNavigate('evidence')} accent />
        <Stat label="Verified skills" value={String(summary.totalSkills).padStart(2, '0')} sub={`${summary.verifiedSkills} verified`} onClick={() => onNavigate('skills')} />
        <Stat label="Average proficiency" value={`${avg}%`} sub="Open skill profile" onClick={() => onNavigate('skills')} />
        <Stat label="Industry alignment" value={summary.industryAlignment !== null ? `${summary.industryAlignment}%` : '—'} sub="Live demand" onClick={() => onNavigate('skills')} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-3 p-4">
          <GraduationCap size={18} className="text-[#3959d8]" />
          <div>
            <p className="text-[12px] font-semibold text-[#17213a]">{summary.technicalAverage !== null ? `${summary.technicalAverage}%` : '—'} technical average</p>
            <p className="text-[10px] text-[#8a94a6]">Across {summary.totalSkills} skills</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <ListChecks size={18} className="text-[#aa7822]" />
          <div>
            <p className="text-[12px] font-semibold text-[#17213a]">{summary.needsEvidence} need evidence</p>
            <p className="text-[10px] text-[#8a94a6]">Move from self-declared to verified</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <ClipboardCheck size={18} className="text-[#2c9d78]" />
          <div>
            <p className="text-[12px] font-semibold text-[#17213a]">{profile.assessments.length > 0 ? 'Assessed' : 'No assessments yet'}</p>
            <p className="text-[10px] text-[#8a94a6]">
              {profile.latestAssessment ? `Latest: ${profile.latestAssessment.score}/100 · ${profile.latestAssessment.skillName}` : 'Take an assessment for verified scores'}
            </p>
          </div>
        </Card>
      </div>
    </section>
  )
}

export function PortfolioChips({ profile }: { profile: SkillProfileResponse }) {
  const { portfolio } = profile
  const items = [
    ['Projects', portfolio.projectCount, Award],
    ['Certificates', portfolio.certificateCount, Award],
    ['Internships', portfolio.internshipCount, Award],
    ['Achievements', portfolio.achievementCount, Award],
  ] as const
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(([label, value, Icon]) => (
        <div key={label} className="flex items-center justify-between rounded-lg bg-[#f7f8fb] px-3 py-2">
          <span className="flex items-center gap-2 text-[11px] text-[#6e798d]"><Icon size={12} className="text-[#3959d8]" />{label}</span>
          <span className="text-[13px] font-semibold text-[#17213a]">{value}</span>
        </div>
      ))}
    </div>
  )
}