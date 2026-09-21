import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

function loadEnv() {
  const raw = readFileSync(join(process.cwd(), '.env'), 'utf8')
  for (const line of raw.split('\n')) {
    const clean = line.replace(/\r$/, '')
    const m = clean.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
  }
}

loadEnv()

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const __dir = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dir, 'migrations')
const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()

async function main() {
  await pool.query(`create table if not exists _migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`)
  const applied = await pool.query('select name from _migrations')
  const appliedSet = new Set(applied.rows.map((r) => r.name))
  let ran = 0
  for (const file of files) {
    if (appliedSet.has(file)) continue
    const sql = readFileSync(join(migrationsDir, file), 'utf8')
    const client = await pool.connect()
    try {
      await client.query('begin')
      await client.query(sql)
      await client.query('insert into _migrations (name) values ($1)', [file])
      await client.query('commit')
      console.log(`applied ${file}`)
      ran += 1
    } catch (err) {
      await client.query('rollback')
      console.error(`migration ${file} failed:`, err.message)
      process.exitCode = 1
      break
    } finally {
      client.release()
    }
  }
  if (ran === 0) console.log('no pending migrations')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})