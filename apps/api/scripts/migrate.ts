import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const dir = join(import.meta.dirname, '..', 'migrations');

await pool.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

const applied = new Set(
  (await pool.query('SELECT filename FROM schema_migrations')).rows.map(r => r.filename),
);

for (const file of (await readdir(dir)).filter(f => f.endsWith('.sql')).sort()) {
  if (applied.has(file)) continue;
  const sql = await readFile(join(dir, file), 'utf8');
  const client = await pool.connect();
  try {
    await client.query(sql); // file sudah memuat BEGIN/COMMIT sendiri
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
    console.log(`applied: ${file}`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
await pool.end();