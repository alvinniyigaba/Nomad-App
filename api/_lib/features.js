// Features that are live for named members only while they are being
// tried out. JOURNEY_PREVIEW_USERS is a comma-separated list of usernames
// (or "*" for everyone); with it unset the journey screens are on for the
// first tester alone. The server decides — the client only reads the flag
// off its session — so a member can't switch a preview on for themselves.
const DEFAULT_JOURNEY_USERS = 'niyigaba';

export function journeyEnabled(username) {
  const list = (process.env.JOURNEY_PREVIEW_USERS ?? DEFAULT_JOURNEY_USERS)
    .split(',')
    .map((u) => u.trim().toLowerCase())
    .filter(Boolean);
  return list.includes('*') || list.includes((username ?? '').trim().toLowerCase());
}
