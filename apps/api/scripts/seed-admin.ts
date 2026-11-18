import argon2 from 'argon2';
import { Pool } from 'pg';

const { ADMIN_EMAIL, ADMIN_PASSWORD, DATABASE_URL } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error('Set ADMIN_EMAIL dan ADMIN_PASSWORD');

const pool = new Pool({ connectionString: DATABASE_URL });
const hash = await argon2.hash(ADMIN_PASSWORD);
await pool.query(
  `INSERT INTO users (email, password_hash, display_name, role)
   VALUES ($1, $2, 'Admin', 'admin')
   ON CONFLICT DO NOTHING`,
  [ADMIN_EMAIL, hash],
);
console.log('admin seeded');
await pool.end();