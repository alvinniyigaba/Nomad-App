import { getSession, lockSession, revokeSession, clearSessionCookie } from '../_lib/auth.js';

// Two ways out of the app, one function (Vercel's Hobby plan caps Serverless
// Functions at 12):
// - "Lock the app" (default) keeps the session — the device stays remembered
//   — but clears pin_verified_at, so the next screen is the PIN keypad.
// - { signOut: true } revokes the session and clears the cookie, so the next
//   screen is the username/password form. For shared devices and switching
//   accounts.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getSession(req);
  if (req.body?.signOut === true) {
    if (session) await revokeSession(session);
    clearSessionCookie(res);
    return res.status(200).json({ ok: true, signedOut: true });
  }
  if (session) await lockSession(session);
  return res.status(200).json({ ok: true });
}
