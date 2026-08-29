export const customer = {
  name: 'Wanjiru',
  phoneMasked: '0722 ••• 418',
  email: 'w.kamau@example.co.ke',
};

export const rates = {
  savings: 9.2, // % p.a.
  loan: 13.5, // % p.a.
};

export const position = {
  total: 1284500,
  monthChange: 30120,
  saved: 640000,
  owed: 144000,
  invested: 788500,
};

export const savings = {
  balance: 640000,
  goals: [
    {
      id: 'shamba-fund',
      name: 'Shamba fund',
      balance: 420000,
      target: 900000,
      targetDate: 'February 2027',
      pctFunded: 47,
      behindPace: 18000,
      interestEarned: 21340,
      pledged: 180000,
      pledgeUnlocks: '5 December',
      autoSave: { amount: 15000, day: '1st of the month', rail: 'M-Pesa' },
      activity: [
        { label: 'Auto-save', meta: '1 August · M-Pesa', amount: 15000 },
        { label: 'Interest', meta: '31 July', amount: 3180 },
        { label: 'Top-up', meta: '18 July · PesaLink', amount: 40000 },
      ],
    },
    {
      id: 'emergency',
      name: 'Emergency',
      balance: 220000,
      target: null,
      note: 'No target · fully liquid',
      fullyLiquid: true,
    },
  ],
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

export const withdrawSource = {
  accountName: 'Emergency savings',
  available: 220000,
  presets: [10000, 45000],
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

export const kyc = {
  step: 3,
  totalSteps: 4,
  phoneVerified: '0722 ••• 418 · verified',
  idMatched: '•••••• 7431 · matched',
};
