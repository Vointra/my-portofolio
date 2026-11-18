import { createHmac, randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { pg } from '../../db.js';
import { config } from '../../config.js';

type Role = 'admin' | 'user';

// Hash palsu agar waktu respons sama, baik email ada maupun tidak
const DUMMY_HASH = await argon2.hash('dummy-password-for-timing');

export const hashToken = (token: string) =>
  createHmac('sha256', config.refreshSecret).update(token).digest('hex');

const newToken = () => randomBytes(32).toString('base64url');
const expiry = () => new Date(Date.now() + config.refreshTtlMs);

export async function verifyCredentials(email: string, password: string) {
  const { rows } = await pg.query(
    'SELECT id, password_hash, role FROM users WHERE lower(email) = lower($1)',
    [email],
  );
  const user = rows[0];
  const ok = await argon2.verify(user?.password_hash ?? DUMMY_HASH, password);
  return user && ok ? { id: String(user.id), role: user.role as Role } : null;
}

export async function issueRefreshToken(userId: string, userAgent?: string) {
  const token = newToken();
  await pg.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent)
     VALUES ($1, $2, $3, $4)`,
    [userId, hashToken(token), expiry(), userAgent ?? null],
  );
  return token;
}

export async function rotateRefreshToken(token: string, userAgent?: string) {
  const client = await pg.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at, u.role
         FROM refresh_tokens rt
         JOIN users u ON u.id = rt.user_id
        WHERE rt.token_hash = $1
          FOR UPDATE OF rt`,
      [hashToken(token)],
    );
    const row = rows[0];

    if (!row) {
      await client.query('ROLLBACK');
      return null;
    }
    if (row.revoked_at) {
      // Token lama dipakai ulang: cabut seluruh sesi user ini
      await client.query(
        'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
        [row.user_id],
      );
      await client.query('COMMIT');
      return null;
    }
    if (new Date(row.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query('UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1', [row.id]);
    const next = newToken();
    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [row.user_id, hashToken(next), expiry(), userAgent ?? null],
    );
    await client.query('COMMIT');
    return { userId: String(row.user_id), role: row.role as Role, refreshToken: next };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function revokeRefreshToken(token: string) {
  await pg.query(
    'UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL',
    [hashToken(token)],
  );
}
