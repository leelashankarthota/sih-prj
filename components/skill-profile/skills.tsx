'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { ChevronDown, FileText, Laptop, Plus, Search, ShieldCheck, Trash2, X } from 'lucide-react'
import { SkillProfileApiError, skillProfileApi, type AddSkillInput, type EvidenceInput } from '@/lib/api/client'
import type { EvidenceRecord, EvidenceType, SkillProfileResponse, SkillTaxonomyItem, StudentSkill, VerificationStatus } from '@/lib/types/skill-profile'
import { Badge, Card, EmptyState, ProgressBar, SectionHeader, demandTone, proficiencyColor } from '@/components/skill-profile/ui'

const EVIDENCE_TYPES: { value: EvidenceType; label: string }[] = [
  { value: 'PROJECT', label: 'Project' },
  { value: 'CERTIFICATE', label: 'Certificate' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'ASSESSMENT', label: 'Assessment' },
  { value: 'ACADEMIC', label: 'Academic course' },
  { value: 'INDUSTRY', label: 'Industry experience' },
  { value: 'COMPETITION', label: 'Competition' },
  { value: 'PORTFOLIO', label: 'Portfolio' },
]

type VerificationFilter = 'all' | VerificationStatus | 'unverified'

const VERIFIED_LABEL: Record<VerificationStatus, string> = {
  SELF_DECLARED: 'Self-declared',
  ASSESSED: 'Assessed',
  EVIDENCE_SUPPORTED: 'Evidence',
  VERIFIED: 'Verified',
  EXPIRED: 'Expired',
  REJECTED: 'Rejected',
}

const verificationTone = (v: VerificationStatus) =>
  v === 'VERIFIED' ? 'verified' : v === 'REJECTED' ? 'rejected' : 'neutral'

function evidenceTone(v: EvidenceRecord['verificationStatus']) {
  return v === 'VERIFIED' ? 'verified' : v === 'REJECTED' ? 'rejected' : 'pending'
}

function isMatching(skill: StudentSkill, query: string, categoryId: string, verification: VerificationFilter): boolean {
  const q = query.trim().toLowerCase()
  if (q && !`${skill.name} ${skill.canonicalName ?? ''}`.toLowerCase().includes(q)) return false
  if (categoryId !== 'all' && String(skill.categoryId ?? '') !== categoryId) return false
  if (verification === 'all') return true
  if (verification === 'unverified') return ['SELF_DECLARED'].includes(skill.verificationStatus)
  return skill.verificationStatus === verification
}

export function SkillsSection({ profile, onChange, notify }: { profile: SkillProfileResponse; onChange: () => void; notify: (m: string) => void }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [verification, setVerification] = useState<VerificationFilter>('all')
  const [editorOpen, setEditorOpen] = useState(false)
  const [expandedEvidence, setExpandedEvidence] = useState<number | null>(null)

  const filtered = useMemo(
    () => profile.skills.filter((s) => isMatching(s, query, category, verification)),
    [profile.skills, query, category, verification],
  )

  return (
    <section id="skills" className="scroll-mt-24">
      <Card>
        <SectionHeader
          eyebrow="Skill inventory"
          title={`Skills (${profile.skills.length})`}
          subtitle="Skills are mapped to the platform taxonomy. Verification status is owned by the system — adding evidence moves a skill toward verified."
          action={
            <button
              onClick={() => setEditorOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#17213a] px-3.5 py-2.5 text-xs font-semibold text-white"
            >
              <Plus size={14} /> Add skill
            </button>
          }
        />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-52 flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa3b3]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your skills…"
              aria-label="Search skills"
              className="w-full rounded-lg border border-[#e6eaf0] py-2 pl-9 pr-3 text-[12px] outline-none focus:border-[#3959d8]"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
            className="rounded-lg border border-[#e6eaf0] px-3 py-2 text-[12px] text-[#6e798d] outline-none focus:border-[#3959d8]"
          >
            <option value="all">All categories</option>
            {profile.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={verification}
            onChange={(e) => setVerification(e.target.value as VerificationFilter)}
            aria-label="Filter by verification"
            className="rounded-lg border border-[#e6eaf0] px-3 py-2 text-[12px] text-[#6e798d] outline-none focus:border-[#3959d8]"
          >
            <option value="all">All statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="EVIDENCE_SUPPORTED">Has evidence</option>
            <option value="SELF_DECLARED">Self-declared</option>
            <option value="unverified">Not yet verified</option>
          </select>
        </div>

        {editorOpen && (
          <SkillEditor
            profile={profile}
            onClose={() => setEditorOpen(false)}
            onDone={(m) => {
              setEditorOpen(false)
              onChange()
              notify(m)
            }}
            notify={notify}
          />
        )}

        {filtered.length === 0 ? (
          <EmptyState
            title={profile.skills.length === 0 ? 'No skills yet' : 'No skills match your filters'}
            hint={profile.skills.length === 0 ? 'Add your strongest skill so the platform can start matching you.' : 'Try clearing the search or filters above.'}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {filtered.map((skill) => (
              <SkillRow
                key={skill.id}
                skill={skill}
                profile={profile}
                expanded={expandedEvidence === skill.id}
                onToggleEvidence={() => setExpandedEvidence(expandedEvidence === skill.id ? null : skill.id)}
                onChange={onChange}
                notify={notify}
              />
            ))}
          </ul>
        )}
      </Card>
    </section>
  )
}

function SkillRow({
  skill,
  profile,
  expanded,
  onToggleEvidence,
  onChange,
  notify,
}: {
  skill: StudentSkill
  profile: SkillProfileResponse
  expanded: boolean
  onToggleEvidence: () => void
  onChange: () => void
  notify: (m: string) => void
}) {
  const skillEvidence = profile.evidence.filter((e) => e.studentSkillId === skill.id)
  const pendingVerification = skillEvidence.filter((e) => e.verificationStatus === 'PENDING').length
  const [removing, setRemoving] = useState(false)

  async function remove() {
    if (!window.confirm(`Remove ${skill.name} from your profile? Evidence attached to it is removed too.`)) return
    setRemoving(true)
    try {
      await skillProfileApi.skills.remove(skill.id)
      onChange()
      notify('Skill removed')
    } catch (err) {
      notify(err instanceof SkillProfileApiError ? err.message : 'Could not remove skill')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <li className="rounded-xl border border-[#edf0f4] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-[#17213a]">{skill.name}</h4>
            <Badge tone={verificationTone(skill.verificationStatus)}>{VERIFIED_LABEL[skill.verificationStatus]}</Badge>
            {skill.demand.level !== 'Unavailable' && <Badge tone={demandTone(skill.demand.level)}>{skill.demand.level} demand</Badge>}
          </div>
          <p className="mt-1 text-[11px] text-[#8a94a6]">
            {skill.categoryName ?? 'General'} · {skill.experienceMonths > 0 ? `${skill.experienceMonths} mo experience` : 'No experience yet'} · Updated {new Date(skill.lastUpdatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-32">
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className={proficiencyColor(skill.proficiencyLevel)}>{skill.proficiencyLevel}</span>
              <span className="font-semibold text-[#3959d8]">{skill.score}</span>
            </div>
            <ProgressBar value={skill.score} />
          </div>
          <button onClick={onToggleEvidence} aria-expanded={expanded} className="inline-flex items-center gap-1 text-[11px] font-medium text-[#3959d8]">
            <FileText size={13} /> {skill.evidenceCount} evidence
          </button>
          <button onClick={remove} disabled={removing} aria-label={`Remove ${skill.name}`} className="text-[#d36b6b] disabled:opacity-40">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      {expanded && (
        <EvidencePanel skill={skill} evidence={skillEvidence} pendingVerification={pendingVerification} onChange={onChange} notify={notify} />
      )}
    </li>
  )
}

function EvidencePanel({
  skill,
  evidence,
  pendingVerification,
  onChange,
  notify,
}: {
  skill: StudentSkill
  evidence: EvidenceRecord[]
  pendingVerification: number
  onChange: () => void
  notify: (m: string) => void
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<EvidenceInput>({ evidenceType: 'PROJECT', title: '', description: '', url: '' })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await skillProfileApi.evidence.add(skill.id, { ...form, title: form.title.trim() })
      setForm({ evidenceType: 'PROJECT', title: '', description: '', url: '' })
      setFormOpen(false)
      onChange()
      notify('Evidence added — pending review')
    } catch (err) {
      notify(err instanceof SkillProfileApiError ? err.message : 'Could not add evidence')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 border-t border-[#edf0f4] pt-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#8a94a6]">
          Evidence{pendingVerification > 0 ? ` · ${pendingVerification} pending review` : ''}
        </p>
        <button onClick={() => setFormOpen((v) => !v)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3959d8]">
          {formOpen ? <X size={13} /> : <Plus size={13} />} {formOpen ? 'Cancel' : 'Add evidence'}
        </button>
      </div>

      {evidence.length === 0 && !formOpen && (
        <p className="mt-3 rounded-lg bg-[#f7f8fb] px-3 py-4 text-center text-[11px] text-[#8a94a6]">
          No evidence yet — add a project, certificate, internship or assessment record.
        </p>
      )}

      {formOpen && (
        <form onSubmit={submit} className="mt-3 grid gap-3 rounded-xl bg-[#f7f8fb] p-3 sm:grid-cols-2">
          <select value={form.evidenceType} onChange={(e) => setForm({ ...form, evidenceType: e.target.value as EvidenceType })} className="rounded-lg border border-[#e6eaf0] px-3 py-2 text-[12px]">
            {EVIDENCE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="rounded-lg border border-[#e6eaf0] px-3 py-2 text-[12px] outline-none focus:border-[#3959d8]" />
          <textarea value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" className="min-h-16 rounded-lg border border-[#e6eaf0] p-3 text-[12px] outline-none focus:border-[#3959d8] sm:col-span-2" />
          <input value={form.url ?? ''} onChange={(e) => setForm({ ...form, url: e.target.value })} type="url" placeholder="https://… (optional)" className="rounded-lg border border-[#e6eaf0] px-3 py-2 text-[12px] outline-none focus:border-[#3959d8] sm:col-span-2" />
          <button disabled={busy} className="rounded-lg bg-[#17213a] px-3 py-2 text-xs font-semibold text-white sm:col-span-2 disabled:opacity-50">
            Save evidence
          </button>
        </form>
      )}

      {evidence.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {evidence.map((e) => (
            <EvidenceRowItem key={e.id} evidence={e} onChange={onChange} notify={notify} />
          ))}
        </ul>
      )}
    </div>
  )
}

function EvidenceRowItem({ evidence, onChange, notify }: { evidence: EvidenceRecord; onChange: () => void; notify: (m: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [revising, setRevising] = useState(false)
  const [form, setForm] = useState<EvidenceInput>({
    evidenceType: evidence.evidenceType,
    title: evidence.title,
    description: evidence.description,
    url: evidence.url,
  })

  async function act(fn: () => Promise<unknown>, message: string) {
    setBusy(true)
    try {
      await fn()
      setRevising(false)
      onChange()
      notify(message)
    } catch (err) {
      notify(err instanceof SkillProfileApiError ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="rounded-xl border border-[#e6eaf0] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[12px] font-semibold text-[#17213a]">{evidence.title}</p>
            <Badge tone={evidenceTone(evidence.verificationStatus)}>{evidence.verificationStatus}</Badge>
          </div>
          <p className="mt-1 text-[11px] text-[#8a94a6]">
            {evidence.evidenceType.toLowerCase()} · {new Date(evidence.createdAt).toLocaleDateString()}
          </p>
          {evidence.description && <p className="mt-1 text-[11px] leading-5 text-[#6e798d]">{evidence.description}</p>}
          {evidence.url && (
            <a href={evidence.url} target="_blank" rel="noreferrer" className="mt-1 inline-block max-w-full truncate text-[11px] font-medium text-[#3959d8]">
              {evidence.url}
            </a>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => act(() => skillProfileApi.evidence.requestVerification(evidence.id), 'Verification requested')}
            disabled={busy || evidence.verificationStatus === 'VERIFIED'}
            className="inline-flex items-center gap-1 rounded-lg bg-[#eef1ff] px-2.5 py-1.5 text-[11px] font-semibold text-[#3959d8] disabled:opacity-40"
          >
            <ShieldCheck size={12} /> Verify
          </button>
          <button onClick={() => setRevising((v) => !v)} disabled={busy} aria-label="Edit evidence" className="text-[#6e798d] disabled:opacity-40">
            {revising ? <X size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={() => {
              if (window.confirm('Remove this evidence record?')) act(() => skillProfileApi.evidence.remove(evidence.id), 'Evidence removed')
            }}
            disabled={busy}
            aria-label="Delete evidence"
            className="text-[#d36b6b] disabled:opacity-40"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {revising && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void act(
              () => skillProfileApi.evidence.update(evidence.id, { ...form, title: form.title.trim() }),
              'Evidence updated',
            )
          }}
          className="mt-3 grid gap-2 rounded-lg bg-[#f7f8fb] p-3 sm:grid-cols-2"
        >
          <select value={form.evidenceType} onChange={(e) => setForm({ ...form, evidenceType: e.target.value as EvidenceType })} className="rounded-lg border border-[#e6eaf0] px-2 py-1.5 text-[11px]">
            {EVIDENCE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg border border-[#e6eaf0] px-2 py-1.5 text-[11px] outline-none focus:border-[#3959d8]" />
          <textarea value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-14 rounded-lg border border-[#e6eaf0] p-2 text-[11px] outline-none focus:border-[#3959d8] sm:col-span-2" />
          <input value={form.url ?? ''} onChange={(e) => setForm({ ...form, url: e.target.value })} type="url" className="rounded-lg border border-[#e6eaf0] px-2 py-1.5 text-[11px] outline-none focus:border-[#3959d8] sm:col-span-2" />
          <button disabled={busy} className="rounded-lg bg-[#17213a] px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50 sm:col-span-2">
            Save changes
          </button>
        </form>
      )}
    </li>
  )
}

function SkillEditor({
  profile,
  onClose,
  onDone,
  notify,
}: {
  profile: SkillProfileResponse
  onClose: () => void
  onDone: (message: string) => void
  notify: (m: string) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SkillTaxonomyItem[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<SkillTaxonomyItem | null>(null)
  const [score, setScore] = useState(70)
  const [experienceMonths, setExperienceMonths] = useState(0)
  const [adding, setAdding] = useState(false)
  const [duplicate, setDuplicate] = useState<string | null>(null)
  const existingTaxonomy = new Set(profile.skills.map((s) => s.taxonomyId).filter((v): v is number => v !== null))
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runSearch = useCallback((q: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!q.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const { skills } = await skillProfileApi.skillsDirectory.search(q, 12)
        setResults(skills.filter((s) => !existingTaxonomy.has(s.id)))
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 220)
  }, [existingTaxonomy])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setAdding(true)
    setDuplicate(null)
    const payload: AddSkillInput = { taxonomyId: selected.id, score, experienceMonths }
    try {
      await skillProfileApi.skills.add(payload)
      onDone('Skill added')
    } catch (err) {
      if (err instanceof SkillProfileApiError && err.code === 'DUPLICATE_SKILL') {
        setDuplicate(err.message)
        setAdding(false)
        return
      }
      notify(err instanceof SkillProfileApiError ? err.message : 'Could not add skill')
      setAdding(false)
    }
  }

  return (
    <form onSubmit={submit} className="mb-5 rounded-xl border border-[#3959d8]/30 bg-[#fafbff] p-4" aria-label="Add skill">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[#17213a]">Add a skill</h4>
        <button type="button" onClick={onClose} aria-label="Close editor" className="text-[#8a94a6]">
          <X size={16} />
        </button>
      </div>

      {!selected ? (
        <>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa3b3]" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                runSearch(e.target.value)
              }}
              placeholder="Search the platform skill catalogue (e.g. Python, Communication, Data Analysis)…"
              className="w-full rounded-lg border border-[#e6eaf0] px-3 py-2 pl-9 text-[12px] outline-none focus:border-[#3959d8]"
            />
          </div>
          {searching && <p className="mt-3 text-[11px] text-[#8a94a6]">Searching the catalogue…</p>}
          {!searching && results.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(r)
                      setResults([])
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-[#e6eaf0] bg-white px-3 py-2 text-left hover:border-[#3959d8]"
                  >
                    <span className="text-[12px] font-medium text-[#17213a]">
                      {r.name}
                      {r.canonicalName && r.canonicalName !== r.name ? <span className="ml-1 text-[10px] text-[#8a94a6]">({r.canonicalName})</span> : null}
                    </span>
                    <span className="text-[10px] text-[#6e798d]">{r.categoryName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!searching && query.trim().length > 0 && results.length === 0 && (
            <p className="mt-3 text-[11px] text-[#8a94a6]">No matching skills found in the catalogue.</p>
          )}
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] text-[#6e798d]">Selected skill</p>
            <div className="mt-1 flex items-center justify-between rounded-lg border border-[#e6eaf0] bg-white px-3 py-2">
              <div>
                <p className="text-[12px] font-semibold text-[#17213a]">{selected.name}</p>
                <p className="text-[10px] text-[#8a94a6]">{selected.canonicalName} · {selected.categoryName}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-[#8a94a6]">
                <X size={14} />
              </button>
            </div>

            <label className="mt-4 block text-[11px] text-[#6e798d]">
              Skill level <span className="font-semibold text-[#3959d8]">{score}/100</span>
              <input type="range" min={0} max={100} value={score} onChange={(e) => setScore(Number(e.target.value))} className="mt-1 w-full accent-[#3959d8]" />
            </label>

            <label className="mt-4 block text-[11px] text-[#6e798d]">
              Experience (months)
              <input
                type="number"
                min={0}
                max={480}
                value={experienceMonths}
                onChange={(e) => setExperienceMonths(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-[#e6eaf0] px-3 py-2 text-[12px] outline-none focus:border-[#3959d8]"
              />
            </label>

            {duplicate && <p className="mt-2 text-[11px] font-medium text-[#d36b6b]">{duplicate}</p>}

            <div className="mt-5 flex items-center gap-2">
              <button disabled={adding} className="rounded-lg bg-[#17213a] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                {adding ? 'Adding…' : 'Add to profile'}
              </button>
              <button type="button" onClick={onClose} className="text-xs font-medium text-[#8a94a6]">
                Cancel
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-white p-3">
            <p className="text-[11px] font-semibold text-[#17213a]">Appearance on your profile</p>
            <div className="mt-3 rounded-lg border border-[#edf0f4] p-3">
              <p className="text-[12px] font-semibold">{selected.name}</p>
              <p className="mt-1 text-[10px] text-[#8a94a6]">Self-declared · score {score}/100</p>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-[#6e798d]">
                <Laptop size={12} className="text-[#3959d8]" /> {selected.categoryName}
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}