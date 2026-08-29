// Seeds the 10 pilot users, their savings accounts, and enough ledger
// history for the app to look lived-in. Destructive: wipes and recreates
// every table it touches (this is a pilot fixture, not a migration —
// never point this at data anyone cares about). Shared between
// scripts/seed.mjs (local dev) and api/admin/setup.js (one-time prod
// bootstrap) so the two never drift apart.
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

function randomPassword() {
  return crypto.randomBytes(6).toString('base64url'); // 8 chars, url-safe
}
function randomPin() {
  return String(crypto.randomInt(0, 10000)).padStart(4, '0');
}

// Minor units = UGX * 100.
const ksh = (n) => BigInt(Math.round(n * 100));

export const USERS = [
  {
    username: 'niyigaba',
    password: 'AppTester1',
    pin: '1234',
    name: 'Niyigaba Mugisha',
    surname: 'Alvin',
    phoneMasked: '0722 ••• 418',
    email: 'alvin.niyigaba@vinandsage.com',
    memberSince: 2026,
    goal: { name: 'Shamba fund', target: 900000, targetDate: '2027-02-01', pledged: 180000, pledgeUnlocks: '2026-12-05', autoSave: { amount: 15000, day: 1, rail: 'M-Pesa' } },
    goalOpening: 361820,
    goalRecent: [
      { kind: 'topup', amount: 40000, rail: 'PesaLink', memo: 'Top-up', daysAgo: 42 },
      { kind: 'interest', amount: 3180, memo: 'Interest', daysAgo: 30 },
      { kind: 'auto_save', amount: 15000, rail: 'M-Pesa', memo: 'Auto-save', daysAgo: 12 },
    ],
    liquidOpening: 220000,
  },
  {
    username: 'hisbabe',
    password: 'AppTester2',
    pin: '5678',
    name: 'Namubiru Angel', surname: 'Kirabo', phoneMasked: '0733 ••• 205', email: 'namubiru.angel@example.com', memberSince: 2026,
    goal: { name: 'School fees', target: 500000, targetDate: '2026-11-01', pledged: 0, pledgeUnlocks: null, autoSave: { amount: 10000, day: 5, rail: 'M-Pesa' } },
    goalOpening: 220000,
    goalRecent: [
      { kind: 'auto_save', amount: 10000, rail: 'M-Pesa', memo: 'Auto-save', daysAgo: 8 },
      { kind: 'interest', amount: 1740, memo: 'Interest', daysAgo: 30 },
    ],
    liquidOpening: 65000,
  },
  {
    username: 'aotieno', name: 'Achieng', surname: 'Otieno', phoneMasked: '0711 ••• 662', email: 'a.otieno@example.co.ke', memberSince: 2022,
    goal: { name: 'Business capital', target: 1500000, targetDate: '2027-06-01', pledged: 400000, pledgeUnlocks: '2027-01-15', autoSave: { amount: 30000, day: 1, rail: 'Bank transfer' } },
    goalOpening: 860000,
    goalRecent: [
      { kind: 'auto_save', amount: 30000, rail: 'Bank transfer', memo: 'Auto-save', daysAgo: 3 },
      { kind: 'interest', amount: 6620, memo: 'Interest', daysAgo: 30 },
      { kind: 'topup', amount: 50000, rail: 'M-Pesa', memo: 'Top-up', daysAgo: 55 },
    ],
    liquidOpening: 340000,
  },
  {
    username: 'pnjoroge', name: 'Peter', surname: 'Njoroge', phoneMasked: '0700 ••• 331', email: 'p.njoroge@example.co.ke', memberSince: 2025,
    goal: { name: 'Rent deposit', target: 150000, targetDate: '2026-10-01', pledged: 0, pledgeUnlocks: null, autoSave: { amount: 8000, day: 15, rail: 'M-Pesa' } },
    goalOpening: 44000,
    goalRecent: [{ kind: 'auto_save', amount: 8000, rail: 'M-Pesa', memo: 'Auto-save', daysAgo: 15 }],
    liquidOpening: 18000,
  },
  {
    username: 'gwambui', name: 'Grace', surname: 'Wambui', phoneMasked: '0721 ••• 947', email: 'g.wambui@example.co.ke', memberSince: 2023,
    goal: { name: 'Wedding fund', target: 800000, targetDate: '2026-12-01', pledged: 0, pledgeUnlocks: null, autoSave: { amount: 20000, day: 1, rail: 'M-Pesa' } },
    goalOpening: 610000,
    goalRecent: [
      { kind: 'auto_save', amount: 20000, rail: 'M-Pesa', memo: 'Auto-save', daysAgo: 5 },
      { kind: 'interest', amount: 4870, memo: 'Interest', daysAgo: 30 },
    ],
    liquidOpening: 95000,
  },
  {
    username: 'kkiptoo', name: 'Kevin', surname: 'Kiptoo', phoneMasked: '0745 ••• 128', email: 'k.kiptoo@example.co.ke', memberSince: 2024,
    goal: { name: 'Land purchase', target: 2000000, targetDate: '2028-01-01', pledged: 300000, pledgeUnlocks: '2027-03-01', autoSave: { amount: 25000, day: 1, rail: 'Bank transfer' } },
    goalOpening: 705000,
    goalRecent: [
      { kind: 'auto_save', amount: 25000, rail: 'Bank transfer', memo: 'Auto-save', daysAgo: 2 },
      { kind: 'interest', amount: 5410, memo: 'Interest', daysAgo: 30 },
    ],
    liquidOpening: 152000,
  },
  {
    username: 'matieno', name: 'Mary', surname: 'Atieno', phoneMasked: '0708 ••• 573', email: 'm.atieno@example.co.ke', memberSince: 2025,
    goal: { name: 'Car fund', target: 600000, targetDate: '2027-04-01', pledged: 0, pledgeUnlocks: null, autoSave: { amount: 12000, day: 1, rail: 'M-Pesa' } },
    goalOpening: 96000,
    goalRecent: [{ kind: 'auto_save', amount: 12000, rail: 'M-Pesa', memo: 'Auto-save', daysAgo: 9 }],
    liquidOpening: 31000,
  },
  {
    username: 'jmwangi', name: 'James', surname: 'Mwangi', phoneMasked: '0790 ••• 264', email: 'j.mwangi@example.co.ke', memberSince: 2022,
    goal: { name: 'Home renovation', target: 1200000, targetDate: '2026-09-01', pledged: 150000, pledgeUnlocks: '2026-11-05', autoSave: { amount: 22000, day: 1, rail: 'M-Pesa' } },
    goalOpening: 940000,
    goalRecent: [
      { kind: 'auto_save', amount: 22000, rail: 'M-Pesa', memo: 'Auto-save', daysAgo: 6 },
      { kind: 'interest', amount: 7260, memo: 'Interest', daysAgo: 30 },
      { kind: 'topup', amount: 25000, rail: 'PesaLink', memo: 'Top-up', daysAgo: 40 },
    ],
    liquidOpening: 210000,
  },
  {
    username: 'fchebet', name: 'Faith', surname: 'Chebet', phoneMasked: '0757 ••• 819', email: 'f.chebet@example.co.ke', memberSince: 2024,
    goal: { name: 'Further studies', target: 700000, targetDate: '2027-08-01', pledged: 0, pledgeUnlocks: null, autoSave: { amount: 14000, day: 1, rail: 'M-Pesa' } },
    goalOpening: 265000,
    goalRecent: [
      { kind: 'auto_save', amount: 14000, rail: 'M-Pesa', memo: 'Auto-save', daysAgo: 4 },
      { kind: 'interest', amount: 2010, memo: 'Interest', daysAgo: 30 },
    ],
    liquidOpening: 58000,
  },
  {
    username: 'bomondi', name: 'Brian', surname: 'Omondi', phoneMasked: '0713 ••• 406', email: 'b.omondi@example.co.ke', memberSince: 2023,
    goal: { name: 'Retirement top-up', target: 3000000, targetDate: '2030-01-01', pledged: 0, pledgeUnlocks: null, autoSave: { amount: 35000, day: 1, rail: 'Bank transfer' } },
    goalOpening: 1180000,
    goalRecent: [
      { kind: 'auto_save', amount: 35000, rail: 'Bank transfer', memo: 'Auto-save', daysAgo: 1 },
      { kind: 'interest', amount: 9040, memo: 'Interest', daysAgo: 30 },
    ],
    liquidOpening: 402000,
  },
];

/** `client` is anything with an async .query(text, params) method (pg.Client or a checked-out pool client). */
export async function seedDatabase(client) {
  const credentials = [];

  await client.query('BEGIN');
  try {
    // Fixture reset — this owns these tables entirely.
    await client.query('TRUNCATE ledger_entries, accounts, kyc_status, user_settings, sessions, users CASCADE');

    for (const u of USERS) {
      const password = u.password ?? randomPassword();
      const pin = u.pin ?? randomPin();
      const passwordHash = await bcrypt.hash(password, 10);
      const pinHash = await bcrypt.hash(pin, 10);

      const { rows: [user] } = await client.query(
        `INSERT INTO users (username, password_hash, pin_hash, name, surname, phone_masked, email, member_since_year)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [u.username, passwordHash, pinHash, u.name, u.surname, u.phoneMasked, u.email, u.memberSince],
      );

      credentials.push({ username: u.username, password, pin });

      await client.query(
        `INSERT INTO kyc_status (user_id, phone_verified, id_matched, selfie_done, source_of_funds_done)
         VALUES ($1, true, true, false, false)`,
        [user.id],
      );
      await client.query(
        `INSERT INTO user_settings (user_id, email_statements, face_id, push, language)
         VALUES ($1, true, true, true, 'en')`,
        [user.id],
      );

      // Backdated to match the opening ledger entry below, so pacing math
      // (elapsed time toward the target) has a real start date to work from.
      const { rows: [goalAccount] } = await client.query(
        `INSERT INTO accounts (user_id, kind, name, target_minor, target_date, auto_save_enabled, auto_save_amount_minor, auto_save_day, auto_save_rail, pledged_minor, pledge_unlocks_date, created_at)
         VALUES ($1,'goal',$2,$3,$4,true,$5,$6,$7,$8,$9, now() - interval '180 days') RETURNING id`,
        [
          user.id,
          u.goal.name,
          ksh(u.goal.target).toString(),
          u.goal.targetDate,
          ksh(u.goal.autoSave.amount).toString(),
          u.goal.autoSave.day,
          u.goal.autoSave.rail,
          ksh(u.goal.pledged).toString(),
          u.goal.pledgeUnlocks,
        ],
      );
      const { rows: [liquidAccount] } = await client.query(
        `INSERT INTO accounts (user_id, kind, name) VALUES ($1,'liquid','Emergency') RETURNING id`,
        [user.id],
      );

      await client.query(
        `INSERT INTO ledger_entries (account_id, user_id, amount_minor, kind, memo, created_at)
         VALUES ($1,$2,$3,'adjustment','Opening balance', now() - interval '180 days')`,
        [goalAccount.id, user.id, ksh(u.goalOpening).toString()],
      );
      for (const entry of u.goalRecent) {
        await client.query(
          `INSERT INTO ledger_entries (account_id, user_id, amount_minor, kind, rail, memo, created_at)
           VALUES ($1,$2,$3,$4,$5,$6, now() - ($7 || ' days')::interval)`,
          [goalAccount.id, user.id, ksh(entry.amount).toString(), entry.kind, entry.rail ?? null, entry.memo, entry.daysAgo],
        );
      }
      await client.query(
        `INSERT INTO ledger_entries (account_id, user_id, amount_minor, kind, memo, created_at)
         VALUES ($1,$2,$3,'adjustment','Opening balance', now() - interval '180 days')`,
        [liquidAccount.id, user.id, ksh(u.liquidOpening).toString()],
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }

  return credentials;
}
