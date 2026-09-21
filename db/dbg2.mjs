import { readFileSync } from 'node:fs'
import pg from 'pg'

const raw = readFileSync('.env', 'utf8')
for (const line of raw.split('\n')) {
  const clean = line.replace(/\r$/, '')
  const m = clean.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const r = await pool.query('select current_database() as db, current_user as usr, current_setting(\'server_version\') as ver')
console.log(r.rows[0])
const t = await pool.query("select table_name from information_schema.tables where table_schema='public' order by table_name")
console.log('tables:', t.rows.map((x) => x.table_name).join(', '))
await pool.end()