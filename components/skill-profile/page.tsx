'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Download, RefreshCw, Sparkles, UserRound } from 'lucide-react'
import { SkillProfileApiError, skillProfileApi } from '@/lib/api/client'
import type { SkillProfileResponse } from '@/lib/types/skill-profile'
import { SummaryCards } from '@/components/skill-profile/summary'
import { SkillsSection } from '@/components/skill-profile/skills'
import { ReadinessSection } from '@/components/skill-profile/readiness'
import { SidePanel } from '@/components/skill-profile/side-panel'

/** Client container: fetches the DB-driven profile once, then flows
 * mutations through the typed API client and re-syncs the aggregate. */
export function SkillProfilePage() {
  const [profile, setProfile] = useState<SkillProfileResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const refresh = useCallback(async () => {
    setSyncing(true)
    try {
      const data = await skillProfileApi.profile.get()
      setProfile(data)
      setError(null)
    } catch (err) {
      setError(err instanceof SkillProfileApiError ? err.message : 'Could not load your skill profile.')
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  function notify(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  if (loading && !profile) {
    return (
      <div className="mx-auto max-w-[1400px] px-5 py-7 sm:px-8 lg:px-10">
        <div className="mb-7 flex animate-pulse flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="h-3 w-44 rounded bg-[#e6eaf0]" />
            <div className="mt-3 h-8 w-64 rounded bg-[#e6eaf0]" />
            <div className="mt-3 h-4 w-96 max-w-full rounded bg-[#e6eaf0]" />
          </div>
          <div className="h-9 w-40 rounded-xl bg-[#e6eaf0]" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-[#e6eaf0] bg-white" />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl border border-[#e6eaf0] bg-white" />
            ))}
          </div>
          <div className="space-y-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-52 animate-pulse rounded-2xl border border-[#e6eaf0] bg-white" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="mx-auto max-w-[1400px] px-5 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-md rounded-2xl border border-[#f3d7d7] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-[#fdecec] text-[#d36b6b]">
            <AlertTriangle size={20} />
          </div>
          <h2 className="mt-4 font-semibold text-[#17213a]">Could not load your profile</h2>
          <p className="mt-2 text-sm leading-6 text-[#788397]">{error}</p>
          <button
            onClick={() => {
              setLoading(true)
              void refresh()
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#17213a] px-4 py-2.5 text-xs font-semibold text-white"
          >
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      </div>
    )
  }

  if (!profile) return null

  const profileLabel = (profile.profile.headline || 'Skill profile') as string

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-7 sm:px-8 lg:px-10">
      {notice && (
        <div role="status" className="fixed right-5 top-5 z-50 rounded-xl bg-[#17213a] px-4 py-3 text-sm text-white shadow-lg">
          {notice}
        </div>
      )}
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.15em] text-[#3959d8]">
            <UserRound size={13} /> Student skill intelligence
          </p>
          <h2 className="text-[29px] font-semibold tracking-[-.045em] text-[#17213a]">{profileLabel}</h2>
          <p className="mt-2 max-w-[680px] text-[13px] leading-6 text-[#788397]">
            Every number here is computed from your database records — your skills, evidence, assessments, target roles and live
            industry demand.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void refresh()}
            className="inline-flex items-center gap-2 rounded-xl border border-[#e6eaf0] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#6e798d] hover:bg-[#f7f8fa]"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => skillProfileApi.profile.download()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#17213a] px-3.5 py-2.5 text-xs font-semibold text-white"
          >
            <Download size={14} /> Download profile
          </button>
        </div>
      </div>

      <SummaryCards profile={profile} onNavigate={(focus) => document.getElementById(focus)?.scrollIntoView({ behavior: 'smooth' })} />

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <SkillsSection profile={profile} onChange={() => void refresh()} notify={notify} />
          <ReadinessSection profile={profile} />
        </div>
        <SidePanel profile={profile} onChange={() => void refresh()} notify={notify} />
      </div>

      <div className="mt-10 flex items-center justify-center gap-2 text-[11px] text-[#9aa3b3]">
        <Sparkles size={12} /> Profile strength {profile.profileStrength.score}/100 · Last synced {formatTime(profile.updatedAt)}
      </div>
    </div>
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${d.toDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}