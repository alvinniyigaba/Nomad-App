import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query } from './db.js';

const COOKIE_NAME = 'nomad_session';
const SESSION_DAYS = 30;
const PIN_FRESH_MS = 15 * 60 * 1000; // re-prompt PIN if idle this long
const MAX_PIN_ATTEMPTS = 5;

export function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((p) => {
      const idx = p.indexOf('=');
      return [p.slice(0, idx).trim(), decodeURIComponent(p.slice(idx + 1).trim())];
    }),
  );
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function cookieHeader(token, { clear = false } = {}) {
  const secure = process.env.VERCEL_ENV === 'production' ? '; Secure' : '';
  const maxAge = clear ? 0 : SESSION_DAYS * 24 * 60 * 60;
  const value = clear ? '' : token;
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export async function createSession(userId, res) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await query('INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [
    userId,
    hashToken(token),
    expiresAt,
  ]);
  res.setHeader('Set-Cookie', cookieHeader(token));
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', cookieHeader(null, { clear: true }));
}

/** Resolves the request's session + user, or null if there isn't a valid one. */
export async function getSession(req) {
  const { [COOKIE_NAME]: token } = parseCookies(req);
  if (!token) return null;
  const { rows } = await query(
    `SELECT s.*, u.id AS user_id, u.username, u.name, u.surname, u.phone_masked, u.email, u.member_since_year,
            u.date_of_birth, u.gender, u.occupation, u.national_id, u.address, u.next_of_kin_name, u.next_of_kin_phone
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

export function requiresPin(session) {
  if (!session.pin_verified_at) return true;
  return Date.now() - new Date(session.pin_verified_at).getTime() > PIN_FRESH_MS;
}

export async function verifyPassword(username, password) {
  const { rows } = await query('SELECT * FROM users WHERE username = $1', [username]);
  const user = rows[0];
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  return ok ? user : null;
}

/** Returns {ok:true} | {ok:false, locked:boolean, attemptsLeft:number} */
export async function verifyPin(session, pin) {
  const { rows } = await query('SELECT pin_hash FROM users WHERE id = $1', [session.user_id]);
  const ok = await bcrypt.compare(pin, rows[0].pin_hash);

  if (ok) {
    await query('UPDATE sessions SET pin_verified_at = now(), failed_pin_attempts = 0 WHERE id = $1', [session.id]);
    return { ok: true };
  }

  const attempts = session.failed_pin_attempts + 1;
  if (attempts >= MAX_PIN_ATTEMPTS) {
    await query('UPDATE sessions SET revoked_at = now() WHERE id = $1', [session.id]);
    return { ok: false, locked: true, attemptsLeft: 0 };
  }
  await query('UPDATE sessions SET failed_pin_attempts = $1 WHERE id = $2', [attempts, session.id]);
  return { ok: false, locked: false, attemptsLeft: MAX_PIN_ATTEMPTS - attempts };
}

export async function lockSession(session) {
  await query('UPDATE sessions SET pin_verified_at = NULL WHERE id = $1', [session.id]);
}

/** For endpoints that move or reveal money: session must exist AND have cleared the PIN. */
export async function requireFullSession(req, res) {
  const session = await getSession(req);
  if (!session || requiresPin(session)) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  return session;
}

export function publicUser(session) {
  return {
    id: session.user_id,
    username: session.username,
    name: session.name,
    surname: session.surname,
    initial: session.username.trim().charAt(0).toUpperCase(),
    phoneMasked: session.phone_masked,
    email: session.email,
    memberSince: session.member_since_year,
    dateOfBirth: session.date_of_birth,
    gender: session.gender,
    occupation: session.occupation,
    nationalId: session.national_id,
    address: session.address,
    nextOfKinName: session.next_of_kin_name,
    nextOfKinPhone: session.next_of_kin_phone,
  };
}
