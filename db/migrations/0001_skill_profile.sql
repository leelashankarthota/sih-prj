-- SkillConnect · Student Skill Profile domain
-- Creates the taxonomy, evidence, career role, demand and configuration
-- structures required by the SIH26044 Student Skill Profile page.

-- ---------------------------------------------------------------------------
-- Skill taxonomy
-- ---------------------------------------------------------------------------

create table if not exists skill_categories (
  id serial primary key,
  name text not null,
  kind text not null default 'technical',     -- technical | soft
  description text not null default '',
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists skill_categories_name_key on skill_categories (name);

create table if not exists skill_taxonomy (
  id serial primary key,
  category_id int not null references skill_categories (id),
  name text not null,
  canonical_name text not null,
  description text not null default '',
  difficulty int not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists skill_taxonomy_canonical_name_key on skill_taxonomy (canonical_name);
create index if not exists skill_taxonomy_category_id_idx on skill_taxonomy (category_id);
create index if not exists skill_taxonomy_is_active_idx on skill_taxonomy (is_active);

create table if not exists skill_aliases (
  id serial primary key,
  skill_id int not null references skill_taxonomy (id) on delete cascade,
  alias text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists skill_aliases_skill_alias_key on skill_aliases (skill_id, lower(alias));

create table if not exists skill_relationships (
  id serial primary key,
  source_skill_id int not null references skill_taxonomy (id) on delete cascade,
  target_skill_id int not null references skill_taxonomy (id) on delete cascade,
  relationship_type text not null default 'RELATED', -- RELATED | PREREQUISITE | ALTERNATIVE | SUBSKILL
  created_at timestamptz not null default now()
);

create unique index if not exists skill_relationships_pair_key
  on skill_relationships (source_skill_id, target_skill_id, relationship_type);

-- ---------------------------------------------------------------------------
-- Evolve the existing per-student `skills` table into the evidence-backed
-- student skill record (the SIH `student_skills` equivalent). Existing
-- columns are preserved so the current workspace keeps working.
-- ---------------------------------------------------------------------------

alter table skills add column if not exists category_id int references skill_categories (id);
alter table skills add column if not exists taxonomy_id int references skill_taxonomy (id);
alter table skills add column if not exists proficiency_level text not null default 'Beginner';
alter table skills add column if not exists verification_status text not null default 'SELF_DECLARED';
alter table skills add column if not exists experience_months int not null default 0;
alter table skills add column if not exists source text not null default 'manual';
alter table skills add column if not exists is_deleted boolean not null default false;

create index if not exists skills_user_deleted_idx on skills (user_id, is_deleted);
create index if not exists skills_taxonomy_idx on skills (taxonomy_id);
create index if not exists skills_category_idx on skills (category_id);

-- ---------------------------------------------------------------------------
-- Skill evidence (verification workflow)
-- ---------------------------------------------------------------------------

create table if not exists skill_evidence (
  id serial primary key,
  student_skill_id int not null references skills (id) on delete cascade,
  evidence_type text not null default 'PORTFOLIO', -- ASSESSMENT|PROJECT|CERTIFICATE|INTERNSHIP|ACADEMIC|INDUSTRY|COMPETITION|PORTFOLIO
  title text not null,
  description text not null default '',
  project_id int,
  certificate_id int references certificates (id) on delete set null,
  assessment_attempt_id int references assessment_attempts (id) on delete set null,
  document_id int references documents (id) on delete set null,
  url text not null default '',
  verification_status text not null default 'PENDING', -- PENDING|VERIFIED|REJECTED
  verified_by text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists skill_evidence_student_skill_idx on skill_evidence (student_skill_id);
create index if not exists skill_evidence_status_idx on skill_evidence (verification_status);

-- ---------------------------------------------------------------------------
-- Assessment → skill scores
-- ---------------------------------------------------------------------------

create table if not exists assessment_skill_scores (
  id serial primary key,
  attempt_id int not null references assessment_attempts (id) on delete cascade,
  skill_id int not null references skill_taxonomy (id) on delete cascade,
  score int not null default 0,
  created_at timestamptz not null default now(),
  unique (attempt_id, skill_id)
);

-- ---------------------------------------------------------------------------
-- Career roles and role requirements
-- ---------------------------------------------------------------------------

create table if not exists career_roles (
  id serial primary key,
  name text not null,
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists career_roles_name_key on career_roles (name);

create table if not exists role_skills (
  id serial primary key,
  role_id int not null references career_roles (id) on delete cascade,
  skill_id int not null references skill_taxonomy (id) on delete cascade,
  weight int not null default 10,
  required_level int not null default 60,
  created_at timestamptz not null default now(),
  unique (role_id, skill_id)
);

create index if not exists role_skills_role_idx on role_skills (role_id);

create table if not exists student_target_roles (
  id serial primary key,
  student_id text not null references "user" (id) on delete cascade,
  role_id int not null references career_roles (id) on delete cascade,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, role_id)
);

create index if not exists student_target_roles_student_idx on student_target_roles (student_id);

-- ---------------------------------------------------------------------------
-- Industry demand snapshots (historical trend data)
-- ---------------------------------------------------------------------------

create table if not exists skill_demand_snapshots (
  id serial primary key,
  skill_id int not null references skill_taxonomy (id) on delete cascade,
  period text not null, -- e.g. '2026-09'
  opportunity_count int not null default 0,
  percentage numeric(5, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (skill_id, period)
);

create index if not exists skill_demand_snapshots_skill_idx on skill_demand_snapshots (skill_id);
create index if not exists skill_demand_snapshots_period_idx on skill_demand_snapshots (period);

-- ---------------------------------------------------------------------------
-- Platform configuration (proficiency thresholds, profile strength weights)
-- ---------------------------------------------------------------------------

create table if not exists system_settings (
  id serial primary key,
  key text not null,
  value jsonb not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists system_settings_key_key on system_settings (key);