// New logins are generated here in the browser, sent once to the server
// (which keeps only a bcrypt hash) and shown once for you to hand over —
// the same rules as scripts/reset-logins.sh.
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function randomIndex(n) {
  // Rejection sampling, so every character is equally likely.
  const limit = Math.floor(256 / n) * n;
  const buf = new Uint8Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % n;
}

export function generatePassword(length = 12) {
  return Array.from({ length }, () => PASSWORD_ALPHABET[randomIndex(PASSWORD_ALPHABET.length)]).join('');
}

/** A 4-digit PIN that isn't all one digit, a straight run, or a year 1900–2029. */
export function generatePin() {
  for (;;) {
    const pin = Array.from({ length: 4 }, () => randomIndex(10)).join('');
    if (/^(\d)\1{3}$/.test(pin)) continue;
    if ('0123456789'.includes(pin) || '9876543210'.includes(pin)) continue;
    if (/^(19|20[0-2])/.test(pin)) continue;
    return pin;
  }
}
