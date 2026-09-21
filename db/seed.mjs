// SkillConnect · deterministic development seed
// Run with: node db/seed.mjs  (or: pnpm db:seed)
// Data is inserted through the same Neon database the API reads.
// The script is idempotent: it resets the demo student's records first,
// then inserts a fixed, deterministic dataset.

import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import pg from 'pg'

const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8')
for (const line of raw.split('\n')) {
  const clean = line.replace(/\r$/, '')
  const m = clean.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}

const { hashPassword } = await import('../node_modules/better-auth/dist/crypto/index.mjs')

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const DEMO_STUDENT = { id: 'demo-student-0001', name: 'Aarav Sharma', email: 'student@skillconnect.demo', password: 'Skilldemo#2026' }
const DEMO_INDUSTRY = { id: 'demo-industry-0001', name: 'Nimbus Labs', email: 'industry@skillconnect.demo' }
const now = () => new Date()

const CATEGORIES = [
  { name: 'Languages', kind: 'technical', description: 'Programming languages and runtimes', order: 1 },
  { name: 'Frameworks', kind: 'technical', description: 'UI and application frameworks', order: 2 },
  { name: 'Frontend Development', kind: 'technical', description: 'Web front-end technologies', order: 3 },
  { name: 'Backend Development', kind: 'technical', description: 'Server-side technologies', order: 4 },
  { name: 'Data & Analytics', kind: 'technical', description: 'Data processing, analysis and ML', order: 5 },
  { name: 'Cloud & DevOps', kind: 'technical', description: 'Cloud platforms and developer operations', order: 6 },
  { name: 'Tools & Platforms', kind: 'technical', description: 'Developer tools and platforms', order: 7 },
  { name: 'Domain Knowledge', kind: 'technical', description: 'Domain and industry knowledge', order: 8 },
  { name: 'Soft Skills', kind: 'soft', description: 'Interpersonal and workplace skills', order: 9 },
]

const SKILLS = [
  // category, name, canonical, aliases, difficulty
  ['Languages', 'JavaScript', 'JavaScript', ['JS', 'ECMAScript', 'Javascript'], 2],
  ['Languages', 'TypeScript', 'TypeScript', ['TS', 'Typescript'], 3],
  ['Languages', 'Python', 'Python', [], 2],
  ['Languages', 'Java', 'Java', [], 3],
  ['Frontend Development', 'HTML', 'HTML', ['Html5'], 1],
  ['Frontend Development', 'CSS', 'CSS', ['Css3', 'Cascading Style Sheets'], 1],
  ['Frontend Development', 'Accessibility', 'Accessibility', ['a11y', 'WCAG'], 2],
  ['Frameworks', 'React', 'React', ['React.js', 'ReactJS'], 3],
  ['Frameworks', 'Next.js', 'Next.js', ['NextJS', 'Next'], 3],
  ['Backend Development', 'Node.js', 'Node.js', ['NodeJS', 'Node'], 3],
  ['Backend Development', 'Express', 'Express', ['Express.js'], 2],
  ['Backend Development', 'REST APIs', 'REST APIs', ['REST API', 'RESTful'], 2],
  ['Backend Development', 'PostgreSQL', 'PostgreSQL', ['Postgres', 'SQL'], 2],
  ['Data & Analytics', 'SQL', 'SQL', ['Structured Query Language'], 2],
  ['Data & Analytics', 'Machine Learning', 'Machine Learning', ['ML'], 4],
  ['Data & Analytics', 'Data Visualization', 'Data Visualization', ['DataViz', 'Visualization'], 2],
  ['Cloud & DevOps', 'Docker', 'Docker', [], 2],
  ['Cloud & DevOps', 'AWS', 'AWS', ['Amazon Web Services'], 3],
  ['Tools & Platforms', 'Git', 'Git', ['GitHub', 'Version Control', 'VCS'], 1],
  ['Tools & Platforms', 'Testing', 'Testing', ['Unit Testing', 'QA', 'Test Automation'], 2],
  ['Tools & Platforms', 'Excel', 'Excel', ['Spreadsheets'], 1],
  ['Domain Knowledge', 'Cybersecurity', 'Cybersecurity', ['Security', 'InfoSec'], 3],
  ['Soft Skills', 'Communication', 'Communication', [], 1],
  ['Soft Skills', 'Teamwork', 'Teamwork', ['Collaboration'], 1],
  ['Soft Skills', 'Leadership', 'Leadership', [], 2],
  ['Soft Skills', 'Problem Solving', 'Problem Solving', [], 2],
  ['Soft Skills', 'Adaptability', 'Adaptability', [], 1],
  ['Soft Skills', 'Presentation', 'Presentation', ['Public Speaking', 'Speaking'], 1],
]

const RELATIONSHIPS = [
  ['React', 'HTML', 'PREREQUISITE'],
  ['React', 'CSS', 'PREREQUISITE'],
  ['React', 'JavaScript', 'PREREQUISITE'],
  ['Next.js', 'React', 'PREREQUISITE'],
  ['Next.js', 'JavaScript', 'PREREQUISITE'],
  ['Node.js', 'JavaScript', 'PREREQUISITE'],
  ['Express', 'Node.js', 'PREREQUISITE'],
  ['REST APIs', 'Node.js', 'RELATED'],
  ['Machine Learning', 'Python', 'PREREQUISITE'],
  ['Machine Learning', 'Data Visualization', 'RELATED'],
  ['Accessibility', 'HTML', 'RELATED'],
  ['Accessibility', 'CSS', 'RELATED'],
  ['TypeScript', 'JavaScript', 'ALTERNATIVE'],
]

const ROLES = [
  {
    name: 'Frontend Developer',
    description: 'Builds accessible, responsive interfaces with modern web technologies.',
    skills: [['React', 25, 70], ['JavaScript', 20, 70], ['CSS', 15, 60], ['HTML', 10, 50], ['TypeScript', 10, 60], ['Accessibility', 10, 60], ['Testing', 10, 50] ],
  },
  {
    name: 'Full-Stack Developer',
    description: 'Works across the front-end and back-end of a product.',
    skills: [['JavaScript', 15, 70], ['React', 15, 65], ['Node.js', 15, 65], ['Express', 10, 60], ['SQL', 10, 60], ['PostgreSQL', 10, 60], ['Git', 10, 50], ['TypeScript', 10, 60], ['REST APIs', 5, 50]],
  },
  {
    name: 'Data Analyst',
    description: 'Turns data into insight for product and business decisions.',
    skills: [['SQL', 20, 65], ['Python', 20, 60], ['Excel', 20, 60], ['Data Visualization', 15, 60], ['Communication', 15, 60], ['Machine Learning', 10, 40]],
  },
  {
    name: 'Software Engineer',
    description: 'Designs and ships reliable software systems as part of a team.',
    skills: [['JavaScript', 15, 70], ['TypeScript', 15, 65], ['Python', 10, 60], ['Java', 10, 60], ['Git', 10, 50], ['SQL', 10, 55], ['Problem Solving', 20, 65], ['Communication', 10, 55]],
  },
]

const OPPORTUNITIES = [
  { title: 'Software Engineer Intern', type: 'internship', location: 'Bangalore · Hybrid', skills: ['React', 'JavaScript', 'CSS', 'Git'], description: 'Join the platform engineering team and ship real features end to end.' },
  { title: 'Frontend Developer Intern', type: 'internship', location: 'Hyderabad · Remote', skills: ['React', 'JavaScript', 'HTML', 'CSS', 'TypeScript'], description: 'Own UI components with a senior product team.' },
  { title: 'Full Stack Developer', type: 'job', location: 'Pune · On-site', skills: ['JavaScript', 'React', 'Node.js', 'Express', 'SQL'], description: 'Entry-level full-stack role across a real consumer product.' },
  { title: 'Data Analyst', type: 'job', location: 'Bengaluru · Hybrid', skills: ['SQL', 'Python', 'Excel', 'Data Visualization'], description: 'Turn product telemetry into decisions.' },
  { title: 'Technical Program Intern', type: 'internship', location: 'Chennai · On-site', skills: ['Communication', 'Problem Solving', 'Leadership'], description: 'Coordinate cross-functional engineering programs.' },
  { title: 'Web Developer Trainee', type: 'training', location: 'Remote', skills: ['HTML', 'CSS', 'JavaScript'], description: 'Structured 12-week paid training with conversion to full-time.' },
  { title: 'Product Engineer Apprentice', type: 'apprenticeship', location: 'Mumbai · Hybrid', skills: ['JavaScript', 'Node.js', 'REST APIs', 'Git'], description: 'Apprenticeship rotation across product squads.' },
  { title: 'Data Engineering Intern', type: 'internship', location: 'Hyderabad · Hybrid', skills: ['Python', 'SQL', 'Machine Learning', 'Data Visualization'], description: 'Build pipelines that power client dashboards.' },
  { title: 'Cloud Support Intern', type: 'internship', location: 'Remote', skills: ['Docker', 'AWS', 'Communication'], description: 'Resolve platform issues and improve runbooks.' },
  { title: 'QA Intern', type: 'internship', location: 'Bengaluru · On-site', skills: ['Testing', 'JavaScript', 'Git'], description: 'Automate quality checks across web applications.' },
]

const DEMO_SKILLS = [
  { name: 'React', score: 82, level: 'Advanced', status: 'VERIFIED', months: 18, source: 'manual' },
  { name: 'JavaScript', score: 76, level: 'Advanced', status: 'VERIFIED', months: 24, source: 'manual' },
  { name: 'HTML', score: 88, level: 'Advanced', status: 'EVIDENCE_SUPPORTED', months: 20, source: 'manual' },
  { name: 'CSS', score: 58, level: 'Intermediate', status: 'SELF_DECLARED', months: 16, source: 'manual' },
  { name: 'TypeScript', score: 40, level: 'Beginner', status: 'SELF_DECLARED', months: 6, source: 'manual' },
  { name: 'Git', score: 72, level: 'Advanced', status: 'VERIFIED', months: 30, source: 'manual' },
  { name: 'Communication', score: 80, level: 'Advanced', status: 'VERIFIED', months: 0, source: 'manual' },
  { name: 'Problem Solving', score: 75, level: 'Advanced', status: 'SELF_DECLARED', months: 0, source: 'manual' },
]

const DEMO_EVIDENCE = [
  { skill: 'React', type: 'CERTIFICATE', title: 'Meta Front-End Developer: React Basics', desc: 'Completed the certified course with a passing project.', status: 'VERIFIED', verifiedBy: 'verifier-admin' },
  { skill: 'React', type: 'PROJECT', title: 'E-commerce dashboard (React)', desc: 'Shipped a product dashboard with charts, filters and auth.', status: 'VERIFIED', verifiedBy: 'verifier-admin' },
  { skill: 'JavaScript', type: 'ASSESSMENT', title: 'JavaScript Fundamentals assessment', desc: 'Platform assessment attempt with skill-level score.', status: 'VERIFIED', verifiedBy: 'verifier-admin' },
  { skill: 'HTML', type: 'PROJECT', title: 'Semantic portfolio site', desc: 'Accessible, responsive personal site using semantic HTML.', status: 'PENDING', verifiedBy: null },
  { skill: 'Communication', type: 'COMPETITION', title: 'National case-study competition runner-up', desc: 'Presented a go-to-market plan to a national jury.', status: 'VERIFIED', verifiedBy: 'verifier-admin' },
]

const ASSESSMENTS = [
  { title: 'JavaScript Fundamentals', skill: 'JavaScript', duration: 30, description: 'Core language, scope, closures and async patterns.' },
  { title: 'React Component Mastery', skill: 'React', duration: 45, description: 'Components, hooks, state and rendering behaviour.' },
]

const CERTIFICATES = [
  { user: DEMO_STUDENT.id, title: 'Meta Front-End Developer: React Basics', issuer: 'Meta', code: 'SC-REACT-001' },
]

const LEARNING_PATHS = [
  { title: 'Close your TypeScript gap', priority: 'priority gap', modules: 4, skills: ['TypeScript'], description: 'A focused sequence to move TypeScript from beginner to intermediate.' },
  { title: 'Full-stack prep: Next.js', priority: 'next gap', modules: 6, skills: ['React', 'TypeScript', 'Next.js'], description: 'Bridge your front-end strength into full-stack delivery.' },
]

const NOTIFICATIONS = [
  { user: DEMO_STUDENT.id, title: 'Welcome to SkillConnect', body: 'Your skill profile is live. Add evidence to strengthen verification.', type: 'system' },
  { user: DEMO_STUDENT.id, title: 'Evidence approved', body: 'A reviewer verified your React certificate.', type: 'certificate' },
]

// ----- helpers -------------------------------------------------------------

async function colIndex(table, name) {
  const r = await pool.query(`select id from ${table} where name = $1 limit 1`, [name])
  if (!r.rows[0]) throw new Error(`seed failed: ${table} row '${name}' missing`)
  return r.rows[0].id
}

async function main() {
  const started = now()
  console.log('seeding skill taxonomy + roles + demo data …')

  // categories
  for (const c of CATEGORIES) {
    await pool.query(
      `insert into skill_categories (name, kind, description, display_order) values ($1,$2,$3,$4)
       on conflict (name) do update set kind = excluded.kind, description = excluded.description, display_order = excluded.display_order`,
      [c.name, c.kind, c.description, c.order],
    )
  }
  const catId = new Map()
  for (const c of CATEGORIES) catId.set(c.name, await colIndex('skill_categories', c.name))

  // taxonomy skills + aliases
  const skillId = new Map()
  for (const [cat, name, canonical, aliases, difficulty] of SKILLS) {
    const r = await pool.query(
      `insert into skill_taxonomy (category_id, name, canonical_name, difficulty, is_active)
       values ($1,$2,$3,$4,true)
       on conflict (canonical_name) do update set category_id = excluded.category_id, name = excluded.name, difficulty = excluded.difficulty, is_active = true
       returning id`,
      [catId.get(cat), name, canonical, difficulty],
    )
    skillId.set(canonical, r.rows[0].id)
    for (const alias of aliases) {
      await pool.query(
        `insert into skill_aliases (skill_id, alias) values ($1,$2) on conflict (skill_id, lower(alias)) do nothing`,
        [r.rows[0].id, alias],
      )
    }
  }

  // relationships
  for (const [src, tgt, kind] of RELATIONSHIPS) {
    if (!skillId.has(src) || !skillId.has(tgt)) continue
    await pool.query(
      `insert into skill_relationships (source_skill_id, target_skill_id, relationship_type) values ($1,$2,$3)
       on conflict (source_skill_id, target_skill_id, relationship_type) do nothing`,
      [skillId.get(src), skillId.get(tgt), kind],
    )
  }

  // career roles + role skills
  const roleId = new Map()
  for (const role of ROLES) {
    const r = await pool.query(
      `insert into career_roles (name, description, is_active) values ($1,$2,true)
       on conflict (name) do update set description = excluded.description, is_active = true
       returning id`,
      [role.name, role.description],
    )
    roleId.set(role.name, r.rows[0].id)
    await pool.query('delete from role_skills where role_id = $1', [r.rows[0].id])
    for (const [skillName, weight, required] of role.skills) {
      if (!skillId.has(skillName)) continue
      await pool.query('insert into role_skills (role_id, skill_id, weight, required_level) values ($1,$2,$3,$4)', [r.rows[0].id, skillId.get(skillName), weight, required])
    }
  }

  // demo users (student + industry)
  const pwdHash = await hashPassword(DEMO_STUDENT.password)
  const userSeed = async (u) => {
    const id = u.id
    await pool.query(
      `insert into "user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt") values ($1,$2,$3,true,null,now(),now())
       on conflict (id) do update set name = excluded.name, email = excluded.email`,
      [id, u.name, u.email],
    )
    await pool.query(
      `insert into account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
       values ($1,$2,'credential',$3,$4,now(),now())
       on conflict (id) do update set password = excluded.password`,
      [u.id + '-account', u.id, id, pwdHash],
    )
  }
  await userSeed(DEMO_STUDENT)
  await pool.query(
    `insert into account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
     values ($1,$2,'credential',$3,null,now(),now())
     on conflict (id) do nothing`,
    [DEMO_INDUSTRY.id + '-account', DEMO_INDUSTRY.id, DEMO_INDUSTRY.id],
  )
  await pool.query(
    `insert into "user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt") values ($1,$2,$3,true,null,now(),now())
     on conflict (id) do update set name = excluded.name, email = excluded.email`,
    [DEMO_INDUSTRY.id, DEMO_INDUSTRY.name, DEMO_INDUSTRY.email],
  )

  // profiles
  await pool.query(
    `insert into skill_profiles (user_id, headline, bio, institution, location, role, created_at, updated_at)
     values ($1,$2,$3,$4,$5,'student',now(),now())
     on conflict (user_id) do update set headline = excluded.headline, bio = excluded.bio, institution = excluded.institution, location = excluded.location, role = excluded.role`,
    [DEMO_STUDENT.id, 'Final-year computer science undergraduate', 'Building accessible, measurable skills toward a front-end engineering career.', 'National Institute of Technology, Warangal', 'Hyderabad, India'],
  )
  await pool.query(
    `insert into skill_profiles (user_id, headline, bio, institution, location, role, created_at, updated_at)
     values ($1,$2,$3,$4,$5,'recruiter',now(),now())
     on conflict (user_id) do update set role = excluded.role`,
    [DEMO_INDUSTRY.id, 'Early-talent programs', 'We hire interns and graduates who prove their skills with evidence.', 'Nimbus Labs', 'Bangalore, India'],
  )

  // reset demo student's skill records for idempotency
  await pool.query(`delete from skill_evidence where student_skill_id in (select id from skills where user_id = $1)`, [DEMO_STUDENT.id])
  await pool.query(`delete from skills where user_id = $1`, [DEMO_STUDENT.id])
  await pool.query(`delete from student_target_roles where student_id = $1`, [DEMO_STUDENT.id])
  await pool.query(`delete from assessment_attempts where user_id = $1`, [DEMO_STUDENT.id])
  await pool.query(`delete from assessment_skill_scores where attempt_id not in (select id from assessment_attempts)`, [])
  await pool.query(`delete from assessments where title in ($1,$2)`, [ASSESSMENTS[0].title, ASSESSMENTS[1].title])
  await pool.query(`delete from certificates where user_id = $1`, [DEMO_STUDENT.id])
  await pool.query(`delete from notifications where user_id = $1`, [DEMO_STUDENT.id])
  await pool.query(`delete from learning_paths where title in ($1,$2)`, [LEARNING_PATHS[0].title, LEARNING_PATHS[1].title])
  await pool.query(`delete from opportunities where owner_id = $1`, [DEMO_INDUSTRY.id])

  // student target roles
  await pool.query('insert into student_target_roles (student_id, role_id, is_primary) values ($1,$2,true)', [DEMO_STUDENT.id, roleId.get('Frontend Developer')])
  await pool.query('insert into student_target_roles (student_id, role_id, is_primary) values ($1,$2,false)', [DEMO_STUDENT.id, roleId.get('Full-Stack Developer')])

  // assessments + attempts + skill scores
  for (const a of ASSESSMENTS) {
    await pool.query(
      `insert into assessments (title, description, skill_name, duration_minutes, status) values ($1,$2,$3,$4,'published')`,
      [a.title, a.description, a.skill, a.duration],
    )
  }
  const attemptSeed = [
    { title: 'JavaScript Fundamentals', score: 78, skillCanonical: 'JavaScript' },
    { title: 'React Component Mastery', score: 85, skillCanonical: 'React' },
  ]
  for (const at of attemptSeed) {
    const ass = await pool.query(`select id from assessments where title = $1`, [at.title])
    if (!ass.rows[0]) continue
    const a = await pool.query(
      `insert into assessment_attempts (assessment_id, user_id, score, status, submitted_at, created_at)
       values ($1,$2,$3,'submitted',now(),now()) returning id`,
      [ass.rows[0].id, DEMO_STUDENT.id, at.score],
    )
    await pool.query('insert into assessment_skill_scores (attempt_id, skill_id, score) values ($1,$2,$3) on conflict (attempt_id, skill_id) do nothing', [a.rows[0].id, skillId.get(at.skillCanonical), at.score])
  }

  // student skills + evidence (attempts seeded above so ASSESSMENT evidence can link)
  const skillRecordId = new Map()
  for (const s of DEMO_SKILLS) {
    const tax = skillId.get(s.name)
    const cat = (await pool.query('select category_id from skill_taxonomy where id=$1', [tax])).rows[0].category_id
    const r = await pool.query(
      `insert into skills (user_id, name, level, verified, evidence, category_id, taxonomy_id, proficiency_level, verification_status, experience_months, source)
       values ($1,$2,$3,$4,'',$5,$6,$7,$8,$9,$10) returning id`,
      [DEMO_STUDENT.id, s.name, s.score, s.status === 'VERIFIED', cat, tax, s.level, s.status, s.months, s.source],
    )
    skillRecordId.set(s.name, r.rows[0].id)
  }
  for (const e of DEMO_EVIDENCE) {
    const studentSkillId = skillRecordId.get(e.skill)
    let attemptId = null
    if (e.type === 'ASSESSMENT' && e.skill === 'JavaScript') {
      attemptId = (await pool.query(
        `select aa.id from assessment_attempts aa join assessments a on a.id = aa.assessment_id
         where aa.user_id=$1 and a.title='JavaScript Fundamentals' order by aa.created_at desc limit 1`,
        [DEMO_STUDENT.id],
      )).rows[0]?.id ?? null
    }
    await pool.query(
      `insert into skill_evidence (student_skill_id, evidence_type, title, description, assessment_attempt_id, url, verification_status, verified_by, verified_at)
       values ($1,$2,$3,$4,$5,'',$6,$7,case when $6 = 'VERIFIED' then now() else null end)`,
      [studentSkillId, e.type, e.title, e.desc, attemptId, e.status === 'VERIFIED' ? 'VERIFIED' : 'PENDING', e.verifiedBy],
    )
  }

  // certificates
  for (const c of CERTIFICATES) {
    await pool.query(
      `insert into certificates (user_id, title, issuer, verification_code, issued_at, status)
       values ($1,$2,$3,$4, now() - interval '60 days', 'active')
       on conflict (verification_code) do nothing`,
      [c.user, c.title, c.issuer, c.code],
    )
  }

  // notifications
  for (const n of NOTIFICATIONS) {
    await pool.query('insert into notifications (user_id, title, body, type, created_at) values ($1,$2,$3,$4, now() - interval \'2 days\')', [n.user, n.title, n.body, n.type])
  }

  // learning paths
  for (const p of LEARNING_PATHS) {
    await pool.query(
      `insert into learning_paths (title, description, priority, modules, skill_focus, status)
       values ($1,$2,$3,$4,$5,'published')`,
      [p.title, p.description, p.priority, p.modules, p.skills],
    )
  }

  // opportunities
  for (const o of OPPORTUNITIES) {
    await pool.query(
      `insert into opportunities (owner_id, title, company, description, location, opportunity_type, required_skills, status, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,'published',now(),now())`,
      [DEMO_INDUSTRY.id, o.title, DEMO_INDUSTRY.name, o.description, o.location, o.type, JSON.stringify(o.skills)],
    )
  }

  // industry demand snapshots (derived from the seeded, published opportunities)
  await pool.query('delete from skill_demand_snapshots')
  await pool.query(`
    with demand as (
      select t.id as skill_id, count(*)::int as opportunity_count
      from opportunities o
      cross join lateral jsonb_array_elements_text(
        case when jsonb_typeof(o.required_skills) = 'array' then o.required_skills else '[]'::jsonb end
      ) req
      join skill_taxonomy t on lower(t.canonical_name) = lower(req) or lower(t.name) = lower(req)
      where o.status = 'published' and o.required_skills != '[]'::jsonb
      group by t.id
    ),
    total as (select count(*)::numeric from opportunities where status = 'published')
    insert into skill_demand_snapshots (skill_id, period, opportunity_count, percentage)
    select d.skill_id, '2026-09', d.opportunity_count,
           round((d.opportunity_count / t.count) * 100, 2)::numeric(5,2)
    from demand d, total t
  `)
  await pool.query(`
    with scaled as (
      select skill_id, greatest(1, round(opportunity_count * 0.7))::int as opportunity_count
      from skill_demand_snapshots where period = '2026-09'
    ),
    total as (select count(*)::numeric from opportunities where status = 'published')
    insert into skill_demand_snapshots (skill_id, period, opportunity_count, percentage)
    select s.skill_id, '2026-08', s.opportunity_count,
           round((s.opportunity_count / t.count) * 100, 2)::numeric(5,2)
    from scaled s, total t
  `)

  // platform configuration
  await pool.query(
    `insert into system_settings (key, value, description) values ($1,$2,$3)
     on conflict (key) do update set value = excluded.value, description = excluded.description`,
    ['profile_strength_weights', JSON.stringify({ verifiedSkills: 30, assessmentEvidence: 20, projectEvidence: 10, certificateEvidence: 10, internshipEvidence: 10, profileCompleteness: 10, recentActivity: 10 }), 'Weights (sum 100) used to compute student profile strength.'],
  )
  await pool.query(
    `insert into system_settings (key, value, description) values ($1,$2,$3)
     on conflict (key) do update set value = excluded.value, description = excluded.description`,
    ['proficiency_thresholds', JSON.stringify({ beginnerMax: 40, intermediateMax: 70, advancedMax: 90 }), 'Score → proficiency mapping used by the backend.'],
  )

  console.log(`seeded in ${((now() - started) / 1000).toFixed(1)}s`)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})