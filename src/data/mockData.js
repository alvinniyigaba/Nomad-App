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
};

// Saved, invested and loans are real (see HomeScreen); only the
// month-on-month change is still mock.
export const position = {
  monthChange: 30120,
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
  { id: 'mpesa', label: 'M-Pesa · 0722 ••• 418', meta: 'Instant · UGX 40 fee', fee: 40 },
  { id: 'bank', label: 'KCB · ••• 2043', meta: 'PesaLink · same day · free', fee: 0 },
  { id: 'airtel', label: 'Airtel Money · 0733 ••• 907', meta: 'Instant · UGX 40 fee', fee: 40 },
];

export const documents = [
  { title: 'August statement', meta: 'All accounts · PDF · 214 KB' },
  { title: 'Q2 investor letter', meta: 'Terrain Fund I · PDF' },
  { title: 'Loan agreement', meta: 'Signed 5 February · PDF' },
  { title: 'Withholding tax certificate', meta: 'FY 2025 · KRA · PDF' },
];
