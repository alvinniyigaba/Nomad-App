import { getSession, verifyPin, clearSessionCookie } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  const { pin } = req.body ?? {};
  if (typeof pin !== 'string' || pin.length !== 4) {
    return res.status(400).json({ error: 'Enter your 4-digit PIN' });
  }

  const result = await verifyPin(session, pin);
  if (!result.ok) {
    if (result.locked) clearSessionCookie(res);
    return res.status(401).json(result);
  }
  return res.status(200).json({ ok: true });
}
