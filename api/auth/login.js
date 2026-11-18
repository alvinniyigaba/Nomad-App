import { verifyPassword, createSession } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // Passwords are generated without spaces, so spaces or a line break at
  // either end can only have come from copying it out of a message.
  const user = await verifyPassword(username.trim().toLowerCase(), password.trim());
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });

  await createSession(user.id, res);
  return res.status(200).json({ ok: true, requiresPin: true });
}
