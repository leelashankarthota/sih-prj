-- SkillConnect · Baseline schema
-- Reproduces the pre-existing application schema (better-auth + workspace
-- tables) exactly, so the repository can bootstrap a fresh Neon database.

-- ---------------------------------------------------------------------------
-- better-auth core tables
-- Note: better-auth column names are camelCase; they must be double-quoted in
-- DDL so PostgreSQL preserves their case.
-- ---------------------------------------------------------------------------

create table if not exists "user" (
  id text primary key,
  name text not null,
  email text not null,
  "emailVerified" boolean not null default false,
  image text,
  "createdAt" timestamp not null default now(),
  "updatedAt" timestamp not null default now()
);

create unique index if not exists user_email_key on "user" (email);

create table if not exists session (
  id text primary key,
  "expiresAt" timestamp not null,
  token text not null,
  "createdAt" timestamp not null,
  "updatedAt" timestamp not null,
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null
);

create unique index if not exists session_token_key on session (token);

create table if not exists account (
  id text primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamp,
  "refreshTokenExpiresAt" timestamp,
  scope text,
  password text,
  "createdAt" timestamp not null,
  "updatedAt" timestamp not null
);

create table if not exists verification (
  id text primary key,
  identifier text not null,
  value text not null,
  "expiresAt" timestamp not null,
  "createdAt" timestamp,
  "updatedAt" timestamp
);

-- ---------------------------------------------------------------------------
-- Workspace tables (as previously defined in the database)
-- ---------------------------------------------------------------------------

create table if not exists skill_profiles (
  id serial primary key,
  user_id text not null,
  headline text not null default '',
  bio text not null default '',
  institution text not null default '',
  location text not null default '',
  role text not null default 'student',
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create unique index if not exists skill_profiles_user_id_unique on skill_profiles (user_id);

create table if not exists skills (
  id serial primary key,
  user_id text not null,
  name text not null,
  level integer not null default 0,
  verified boolean not null default false,
  evidence text not null default '',
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists opportunities (
  id serial primary key,
  owner_id text not null,
  title text not null,
  company text not null,
  description text not null default '',
  location text not null default '',
  opportunity_type text not null default 'internship',
  required_skills jsonb not null default '[]'::jsonb,
  status text not null default 'published',
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists applications (
  id serial primary key,
  opportunity_id integer not null,
  applicant_id text not null,
  status text not null default 'applied',
  note text not null default '',
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create unique index if not exists applications_opportunity_applicant_unique
  on applications (opportunity_id, applicant_id);

create table if not exists assessments (
  id serial primary key,
  title text not null,
  description text not null default '',
  skill_name text not null,
  duration_minutes integer not null default 30,
  status text not null default 'published',
  created_at timestamp not null default now()
);

create table if not exists assessment_attempts (
  id serial primary key,
  assessment_id integer not null,
  user_id text not null,
  score integer not null default 0,
  status text not null default 'started',
  submitted_at timestamp,
  created_at timestamp not null default now()
);

create table if not exists learning_paths (
  id serial primary key,
  title text not null,
  description text not null default '',
  priority text not null default 'recommended',
  modules integer not null default 0,
  skill_focus text[] not null default '{}',
  status text not null default 'published',
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists documents (
  id serial primary key,
  user_id text not null,
  name text not null,
  document_type text not null default 'portfolio',
  url text not null default '',
  status text not null default 'pending',
  created_at timestamp not null default now()
);

create table if not exists certificates (
  id serial primary key,
  user_id text not null,
  title text not null,
  issuer text not null,
  verification_code text not null,
  issued_at timestamp not null default now(),
  status text not null default 'active'
);

create unique index if not exists certificates_verification_code_key
  on certificates (verification_code);

create table if not exists notifications (
  id serial primary key,
  user_id text not null,
  title text not null,
  body text not null default '',
  type text not null default 'system',
  read_at timestamp,
  created_at timestamp not null default now()
);

create table if not exists placements (
  id serial primary key,
  student_id text not null,
  opportunity_id integer,
  company text not null,
  role_title text not null,
  status text not null default 'active',
  start_date date,
  end_date date,
  created_at timestamp not null default now()
);

create table if not exists audit_logs (
  id serial primary key,
  actor_id text,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp not null default now()
);

create table if not exists conversations (
  id serial primary key,
  subject text not null,
  created_by text not null,
  created_at timestamp not null default now()
);

create table if not exists messages (
  id serial primary key,
  conversation_id integer not null,
  sender_id text not null,
  body text not null,
  created_at timestamp not null default now()
);