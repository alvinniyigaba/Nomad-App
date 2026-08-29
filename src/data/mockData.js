export const customer = {
  name: 'Wanjiru',
  surname: 'Kamau',
  phoneMasked: '0722 ••• 418',
  email: 'w.kamau@example.co.ke',
  memberSince: '2024',
  payoutAccounts: 'M-Pesa · KCB ••• 2043 · Airtel Money',
};

export const appVersion = 'v2.4';

export const rates = {
  savings: 9.2, // % p.a.
  loan: 13.5, // % p.a.
};

// Saved is real (the ledger, via /api/accounts) — owed and invested stay
// mock until loans and investments are wired up. See HomeScreen.
export const position = {
  monthChange: 30120,
  owed: 144000,
  invested: 788500,
};

export const loan = {
  outstanding: 144000,
  principal: 288000,
  paidInstallments: 6,
  totalInstallments: 12,
  nextDue: { date: '5 September', amount: 24000, rail: 'M-Pesa' },
  pledged: 180000,
  pledgeUnlocks: '5 December',
  schedule: [
    { label: '5 August · paid', amount: 24000, kind: 'paid' },
    { label: '5 September · due', amount: 24000, kind: 'due' },
    { label: '5 October', amount: 24000, kind: 'future' },
    { label: '5 November', amount: 24000, kind: 'future' },
    { label: '5 December · final', amount: 24000, kind: 'future' },
  ],
};

export const borrow = {
  availableLimit: 368000, // 80% of unpledged savings
  unpledgedSavings: 460000,
  ltv: 0.8,
  termMonths: 12,
  arrangementFeePct: 0.01,
  presets: [100000, 200000, 300000],
};

export const investments = {
  total: 788500,
  ytdChange: 23780,
  ytdPct: 3.1,
  chartPoints: '0,86 41,78 82,82 123,64 164,66 205,48 246,40 287,26 330,14',
  holdings: [
    { id: 'mmf', name: 'Nomad Money Market Fund', meta: 'Daily liquidity · 10.4% net yield', value: 264500, changePct: 1.8, kind: 'liquid' },
    { id: 'tbill', name: 'Treasury bill ladder', meta: '91-day · next maturity 12 October', value: 324000, changePct: 4.1, kind: 'liquid' },
    { id: 'terrain1', name: 'Nomad Terrain Fund I', meta: 'LP subscription · vintage 2026', value: 200000, note: 'at cost', kind: 'lp' },
    { id: 'terrain2', name: 'Nomad Terrain Fund II', meta: 'Invitation open until 30 September', kind: 'invite' },
  ],
};

export const withdrawDestinations = [
  { id: 'mpesa', label: 'M-Pesa · 0722 ••• 418', meta: 'Instant · KSh 40 fee', fee: 40 },
  { id: 'bank', label: 'KCB · ••• 2043', meta: 'PesaLink · same day · free', fee: 0 },
  { id: 'airtel', label: 'Airtel Money · 0733 ••• 907', meta: 'Instant · KSh 40 fee', fee: 40 },
];

export const documents = [
  { title: 'August statement', meta: 'All accounts · PDF · 214 KB' },
  { title: 'Q2 investor letter', meta: 'Terrain Fund I · PDF' },
  { title: 'Loan agreement', meta: 'Signed 5 February · PDF' },
  { title: 'Withholding tax certificate', meta: 'FY 2025 · KRA · PDF' },
];
