// Every admin call goes to the one admin function (api/admin/index.js) with
// ?resource=. X-Nomad-Admin: 1 is what lets the signed-in staff session
// through — the server ignores the cookie on requests without it.
const signedOutListeners = new Set();

export function onSignedOut(fn) {
  signedOutListeners.add(fn);
  return () => signedOutListeners.delete(fn);
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function admin(resource, { method = 'GET', params = {}, body } = {}) {
  const qs = new URLSearchParams({ resource, ...params });
  const res = await fetch(`/api/admin?${qs}`, {
    method,
    credentials: 'same-origin',
    headers: { 'X-Nomad-Admin': '1', ...(body !== undefined && { 'Content-Type': 'application/json' }) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await readJson(res);
  // A 403 from anything but resource=staff means the sign-in lapsed (PIN
  // timed out, session revoked): send the console back to the sign-in screen.
  if (res.status === 403 && resource !== 'staff') signedOutListeners.forEach((fn) => fn());
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (HTTP ${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function post(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, data: await readJson(res) };
}

export const auth = {
  whoami: () => admin('whoami'),
  signIn: (username, password) => post('/api/auth/login', { username, password }),
  enterPin: (pin) => post('/api/auth/pin', { pin }),
  signOut: () => post('/api/auth/lock', { signOut: true }),
};
