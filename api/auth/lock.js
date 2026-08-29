import { getSession, lockSession } from '../_lib/auth.js';

// "Lock the app" — keeps the session (device stays remembered) but clears
// pin_verified_at so the next screen the user sees is the PIN keypad, not
// the username/password form.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getSession(req);
  if (session) await lockSession(session);
  return res.status(200).json({ ok: true });
}
