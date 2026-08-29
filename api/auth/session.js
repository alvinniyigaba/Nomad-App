import { getSession, requiresPin, publicUser } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getSession(req);
  if (!session) return res.status(200).json({ authenticated: false });

  return res.status(200).json({
    authenticated: true,
    requiresPin: requiresPin(session),
    user: publicUser(session),
  });
}
