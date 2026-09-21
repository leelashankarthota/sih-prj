import { jsonError, requireStudent } from '@/lib/security'
import { getSkillProfile } from '@/lib/server/skill-profile-service'
import { classifyProficiency } from '@/lib/domain/skill-metrics'
import type { SkillProfileResponse } from '@/lib/types/skill-profile'

export const dynamic = 'force-dynamic'

const DEMAND_LABEL: Record<string, string> = {
  High: 'High demand',
  Moderate: 'Moderate demand',
  Low: 'Low demand',
  Limited: 'Limited demand',
  Unavailable: 'Demand data unavailable',
}

function stars(score: number): string {
  return '●'.repeat(Math.max(1, Math.min(5, Math.round(score / 20)))) + '○'.repeat(Math.max(0, 5 - Math.round(score / 20)))
}

function renderProfile(p: SkillProfileResponse): string {
  const rows = p.skills
    .map(
      (s) => `<tr>
        <td>${escapeHtml(s.name)}</td>
        <td>${escapeHtml(s.categoryName ?? '—')}</td>
        <td>${s.score}/100</td>
        <td>${s.proficiencyLevel}</td>
        <td>${s.verificationStatus === 'VERIFIED' ? 'Verified' : s.verificationStatus}</td>
        <td>${DEMAND_LABEL[s.demand.level] ?? s.demand.level}</td>
      </tr>`,
    )
    .join('')

  const roles = p.targetRoles
    .map(
      (r) => `<h3>${escapeHtml(r.roleName)} — ${r.readiness}% ready</h3>
      <ul>${r.requiredSkills
        .map(
          (req) =>
            `<li>${escapeHtml(req.skillName)} (required ${req.requiredLevel}, weighted ${req.weight}) — ${
              r.matched.includes(req.skillName) ? 'matched' : r.partial.includes(req.skillName) ? 'in progress' : 'missing'
            }</li>`,
        )
        .join('')}</ul>`,
    )
    .join('')

  const evidenceRows = p.evidence
    .map(
      (e) => `<tr>
        <td>${escapeHtml(e.skillName)}</td>
        <td>${escapeHtml(e.title)}</td>
        <td>${e.evidenceType}</td>
        <td>${e.verificationStatus}</td>
      </tr>`,
    )
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Skill Profile — ${escapeHtml(p.profile.headline || 'Student')}</title>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #17213a; margin: 40px; }
  h1 { font-size: 26px; margin: 0 0 4px; } h2 { font-size: 18px; border-bottom: 1px solid #e5e9f2; padding-bottom: 6px; margin-top: 28px; }
  h3 { font-size: 15px; margin: 16px 0 4px; }
  .muted { color: #5b6579; } .score { font-size: 13px; color: #5b6579; }
  table { border-collapse: collapse; width: 100%; margin-top: 8px; font-size: 13px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eef1f6; }
  th { color: #5b6579; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: .04em; }
  ul { margin: 4px 0 0; padding-left: 18px; font-size: 13px; }
  @media print { body { margin: 12mm; } h2 { break-after: avoid; } tr { break-inside: avoid; } }
</style>
</head>
<body>
  <h1>${escapeHtml(p.profile.headline || 'Student Skill Profile')}</h1>
  <div class="muted">${escapeHtml([p.profile.institution, p.profile.location].filter(Boolean).join(' · ')) || 'SkillConnect'}</div>
  <div class="score">Profile strength ${p.profileStrength.score}/100 · ${p.profileCompleteness}% complete · Generated ${new Date().toISOString().slice(0, 10)}</div>

  <h2>Skills (${p.skills.length})</h2>
  <table>
    <thead><tr><th>Skill</th><th>Category</th><th>Score</th><th>Level</th><th>Verification</th><th>Demand</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6">No skills yet.</td></tr>'}</tbody>
  </table>

  <h2>Evidence (${p.evidence.length})</h2>
  <table>
    <thead><tr><th>Skill</th><th>Title</th><th>Type</th><th>Status</th></tr></thead>
    <tbody>${evidenceRows || '<tr><td colspan="4">No evidence yet.</td></tr>'}</tbody>
  </table>

  <h2>Target roles</h2>
  ${roles || '<p class="muted">No target roles selected.</p>'}

  <h2>Career-ready skills preview</h2>
  <table>
    <thead><tr><th>Skill</th><th>Score</th><th>Level</th></tr></thead>
    <tbody>${p.skills
      .map(
        (s) =>
          `<tr><td>${escapeHtml(s.name)}</td><td>${stars(s.score)} ${s.score}/100</td><td>${
            s.proficiencyLevel ?? classifyProficiency(s.score)
          }</td></tr>`,
      )
      .join('')}</tbody>
  </table>
</body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function GET() {
  try {
    const { userId } = await requireStudent()
    const profile = await getSkillProfile(userId)
    const html = renderProfile(profile)
    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store, private',
      },
    })
  } catch (error) {
    return jsonError(error)
  }
}