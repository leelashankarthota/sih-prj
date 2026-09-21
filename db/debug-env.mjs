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
const r = await pool.query("select table_name from information_schema.tables where table_schema='public' order by table_name")
console.log(r.rows.map((x) => x.table_name).join(', '))
const r2 = await pool.query('select count(*) from _migrations')
console.log('migrations applied:', r2.rows[0].count)
await pool.end()