const fs = require('fs');
process.env.DATABASE_URL = fs.readFileSync('.env','utf8').split('\n').map(l=>l.trim()).find(l=>l.startsWith('DATABASE_URL=')).slice(13);
const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  for (const t of ['user','skill_profiles','skills','opportunities','applications','assessments','assessment_attempts','learning_paths','documents','certificates','notifications','placements','audit_logs']) {
    const r = await c.query(`select count(*)::int as n from "${t}"`);
    console.log(t.padEnd(20), r.rows[0].n);
  }
  const s = await c.query(`select user_id, name, level, verified, evidence from skills order by created_at desc limit 15`);
  console.log('\nSKILL ROWS:'); s.rows.forEach(r=>console.log(JSON.stringify(r)));
  const u = await c.query(`select id, name, email from "user" order by "createdAt" desc limit 10`);
  console.log('\nUSERS:'); u.rows.forEach(r=>console.log(JSON.stringify(r)));
  await c.end();
})().catch(e=>{console.error(e); process.exit(1)});
