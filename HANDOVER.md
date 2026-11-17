# Nomad Financial Services — Handover

Last updated: 2026-09-01

## What this is

A React/Vite PWA for a 13-person pilot of "Nomad" — a savings, loans, and
investments app. Real backend (Neon Postgres via Vercel serverless
functions), real auth (username/password + PIN), real ledger. Not a demo —
pilot users have real balances and real money moving through it.

- **Repo:** github.com/alvinniyigaba/Nomad-App (public)
- **Production:** https://nomad-app-hntl.vercel.app (Vercel project
  `nomad-app-hntl`, team `alvinniyigaba's projects`)
- **Deploy:** automatic on every push to `main` (Vercel's GitHub
  integration) — no manual deploy step
- **Database:** Neon Postgres (connection via `DATABASE_URL` env var)
- **Stack:** React 19 + Vite + react-router-dom, `pg` for Postgres,
  `bcryptjs` for password/PIN hashing, no ORM. `oxlint` for linting.

⚠️ **There are two other Vercel projects linked to this same GitHub repo**
(`nomad-app` and `nomad-customer-app`) — leftovers from earlier setup, not
in active use. Worth deleting to avoid confusion, but not touched during
this session since production traffic is confirmed to be on
`nomad-app-hntl`.

## Core design principles

1. **Derive, don't store.** Account balances are never a stored number —
   they're `sum(amount_minor)` over `ledger_entries`. Same idea for
   Nomad-managed investments: current value comes from the latest row in
   `investment_snapshots`, never a single mutable field.
2. **Append-only ledger.** Never `UPDATE`/`DELETE` a posted ledger entry —
   post a reversing entry instead.
3. **Money is always `bigint` minor units** (UGX × 100), never a float.
4. **One admin dispatcher, not many functions.** Vercel's Hobby plan caps
   Serverless Functions at 12. We're at 11 (see `api/` list below), so all
   admin/back-office operations live in `api/admin/index.js` behind a
   `?resource=` query param rather than one file per operation.

## Schema (`db/schema.sql`)

| Table | Purpose |
|---|---|
| `users` | pilot accounts — username, password/PIN hashes, bio-data (nullable, admin-entered) |
| `sessions` | password session + separate PIN-verified state |
| `accounts` | one row per savings goal (`kind='goal'`) or the liquid fund (`kind='liquid'`); `is_group` + `account_members` for group goals; `closed_at` retires a goal without deleting history |
| `account_members` | membership/role (`admin`/`member`) for group accounts only |
| `ledger_entries` | the append-only source of truth for all balances |
| `kyc_status` | per-user KYC step flags |
| `user_settings` | notification/language toggles |
| `external_holdings` | savings/investment products — `managed_by` is `'nomad'` (Nomad actually manages it, value comes from snapshots) or `'external'` (on record but not run by Nomad; `balance_minor` is a plain number — set by an admin, or by `sync-investments` from the sheet's Est. Worth — and it **counts toward the member's Invested/Total position**) |
| `investment_snapshots` | dated value history per `nomad`-managed holding — one row per (holding, date), re-posting the same date corrects it rather than duplicating |
| `loans` | private loans a member made to (`direction='lent'`) or took from (`'borrowed'`) someone **outside** Nomad — records only, no money moves through Nomad. `loan_ref` is the Loan ID from the member's sheet ("Loans" tab), unique per member. `counterparty` is a first name only (they aren't Nomad members). Outstanding is derived, never stored |
| `loan_repayments` | append-only repayments per loan; a mistake is corrected with a negative amount. Optional `idempotency_key` makes imports safe to re-run |

Migrations are idempotent — `db/schema.sql` uses `CREATE TABLE IF NOT
EXISTS` + `ALTER TABLE ADD COLUMN IF NOT EXISTS`, applied via
`GET /api/admin?resource=migrate&token=...`. Safe to re-run any time.

## API map (`api/`)

**User-facing** (session-gated, no token needed):
- `auth/login.js`, `auth/pin.js`, `auth/session.js`, `auth/lock.js` — password → PIN → full session flow
- `accounts.js` — list accounts, close a goal
- `deposit.js` / `withdraw.js` — post ledger entries (any group member can deposit; only admins can withdraw)
- `groups.js` — list other pilot users (for the member picker) + create a group goal
- `kyc.js` — KYC status
- `external-holdings.js` — user-facing read of a user's holdings (the admin write path is separate, see below). `?resource=loans` on the same function returns their private loans with repayments and totals (`owedToYouMinor`, `youOweMinor`, open loans only) — shared function because of the 12-function Hobby cap; both are read-only and user-scoped

**Admin-only** (`api/admin/index.js`, gated by `ADMIN_TOKEN` query param or `CRON_SECRET` bearer token), dispatched by `?resource=`:
- `migrate` (GET) — applies `db/schema.sql`
- `external-holdings` (GET/POST/PATCH/DELETE) — create/update a holding; POST a dated snapshot via `snapshotDate`+`snapshotValueMinor` on PATCH for `nomad`-managed ones
- `user-profile` (PATCH) — bio-data fields
- `sync-sheet` (GET) — reads a published-CSV shared savings ledger sheet, posts new rows as ledger entries. Runs daily via Vercel Cron.
- `post-entries` (POST) — same validation as sync-sheet but takes pre-parsed rows directly (used when Claude reads a *private* sheet via the Drive connector and submits what it finds, avoiding "publish to web")
- `sync-investments` (GET) — **new this session**, see below. Runs daily via Vercel Cron.
- `loans` (GET `?username` / POST / PATCH) — a member's private loans; POST takes `{ username, loanRef, direction, counterparty, principalMinor, terms?, startDate?, dueDate?, status?, notes? }` and returns 409 if that `loanRef` already exists for them
- `loan-repayments` (POST) — `{ loanId, amountMinor, paidOn, memo?, idempotencyKey? }`, append-only
- `reset-credentials` (POST) — `{ username, password?, pin? }`: sets a new password and/or PIN (stored only as bcrypt hashes, never echoed) and revokes all of that member's sessions. Use `bash scripts/reset-logins.sh <username…|all>` from your own machine: it generates the new logins locally and prints them once, so they never go through GitHub.

## Google Sheets integration

Each pilot user's real-world transactions (savings deposits, and now
investments) are tracked in a personal Google Sheet as an interim,
human-reviewed log, then synced into the real ledger/DB. Two sync
mechanisms exist depending on privacy tradeoffs:

1. **Published-to-web CSV + Vercel Cron** — fully automatic, but requires
   setting the sheet (or a specific tab) to "Anyone with the link can
   view." Used for `sync-sheet` (savings) and the new `sync-investments`.
2. **Claude reads a private sheet via the Drive connector, submits parsed
   rows** — no publishing required, but needs a human (in a Claude
   session) to trigger it. Used for `post-entries`.

### Investments sync (built this session)

Unlike savings (one shared ledger sheet with an explicit owner column per
row), each pilot user has **their own personal sheet** with an
"Investments" tab (the "INVESTMENT MANAGER" table: Investment Start Date,
Investment Vehicle, Investment Currency, Amount, Core Currency, Net
Invested, T.Rate, Current Holding, Est. Worth, TCD, Key). Since there's no
single shared sheet, `sync-investments` reads `INVESTMENT_SHEETS` — a JSON
Vercel env var mapping `username -> published CSV URL for that user's
Investments tab` — and syncs every mapped user's sheet on each run.

For each row: finds-or-creates one `external_holdings` row per Investment
Vehicle (`managed_by` = `'nomad'` if the sheet's "Key" column contains
"Nomad", else `'external'`), always refreshes `interest_rate_bps` and
`notes` from the sheet (the sheet is the source of truth for those), and
always upserts **today's** snapshot from "Est. Worth". On first sight of a
holding it also backfills an inception snapshot from "Net Invested" at the
"Investment Start Date". All snapshot writes are `ON CONFLICT (holding_id,
snapshot_date) DO UPDATE`, so re-running the same day is always safe.

**External rows (Key without "Nomad")** also get `balance_minor` set from
"Est. Worth" on every run — the app reads that field for them, since they
have no snapshot history to derive a value from. Home's "Invested" and the
Position summary count Nomad-managed holdings (from snapshots) **plus**
active external holdings that carry a balance
(`positionInvestedMinor` in `src/utils/investmentSeries.js`); the Invest
screen's headline figure and chart stay Nomad-only, so that number can be
lower than Home's. A blank cell means "no value", not zero: a blank Est.
Worth is rejected (the row is skipped and reported in `errors`), and a
blank TCD leaves the holding's notes alone — so a hand-written note on an
external holding survives re-syncs.

External holdings also carry `start_date` and `invested_minor` (the
sheet's Start Date and Net Invested, refreshed on every sync; settable via
the admin POST/PATCH as `startDate`/`investedMinor`). The Invest screen
renders external holdings with the same card and expandable details as
Nomad-managed ones — a Nomad card derives Start date / Amount invested
from its inception snapshot, an external card reads these two fields. The
Invest headline is everything invested (Nomad + external, same figure as
Home); the chart and year-to-date line stay Nomad-only.

**Financial modeling note:** "Net Invested"/"Current Holding" and "Est.
Worth" deliberately exclude bank/processing fees — those are tracked
separately in the "TCD" (Total Cost to Date) column and surfaced in the
holding's `notes`, not subtracted from the position's value. This was a
real correction made mid-session: the user's bank charged fees *after* the
full transfer had already landed in the investment vehicle, so the fees
are a separate expense, not a reduction of the position itself. Same
gross-vs-net philosophy as the in-app yield calculator.

### To onboard a new pilot user's investments

1. They (or you) fill in the "Investments" tab of their personal sheet,
   matching the "INVESTMENT MANAGER" column layout above.
2. In that sheet: **File → Share → Publish to web**, select the
   **Investments** tab specifically (not "Entire Document"), format CSV.
3. Add their username → published CSV URL as one more entry in the
   `INVESTMENT_SHEETS` JSON env var in Vercel project settings.
4. Redeploy (env var changes need a redeploy to take effect — push any
   commit, or trigger one manually from the Vercel dashboard).

It then syncs automatically every day at 6:10 UTC (`vercel.json` cron),
no manual step needed after that.

## This session's other changes

- **Fixed a real bug**: the yield calculator on `/invest` showed "UGX NaN"
  everywhere. Root cause: `ksh()` in `src/utils/format.js` already calls
  `fmt()` internally; the JSX was calling `ksh(fmt(x))`, double-applying
  formatting and feeding `Math.round()` an already comma-formatted string.
  Fixed in `src/components/YieldCalculator.jsx`.
- **Restructured the calculator** into a collapsed, tappable banner
  (shows a live one-line projection teaser) that expands into the full
  form on tap, to reduce crowding on the Investments page.
- **Seeded the real Mansa X investment** (Niyigaba Alvin's, 9,450,000 UGX
  at 18% from 27 Aug 2026) — see "Known gaps" below on whether this
  actually landed in production.

## Loans (Borrow tab)

The Borrow tab ("Borrow & Lend") shows every loan a member is on. Nothing
moves money: loans are tracked, and the money changes hands outside the
app (mobile money, cash).

**Two kinds, one model** (`loan_agreements`, `loan_parties`,
`loan_payments` in `db/schema.sql`):
- **Between members** (`kind 'member'`): any member sets it up from
  Borrow → New loan (`/loan/new`), naming the lenders and borrowers and
  each one's share. Every party sees it. It starts `proposed` and counts
  for nobody until everyone has accepted; one decline ends it; the creator
  can cancel it while it's waiting. Several borrowers (or lenders) are
  allowed: **split** means each borrower owes only their share, **joint**
  means they owe the whole together (each still counts only their share
  in their own position, so nothing is counted twice).
- **With someone outside Nomad** (`kind 'external'`): a private ledger,
  the member plus a typed name, seen by that member only. No accepting or
  confirming. The older admin-entered `loans`/`loan_repayments` rows are
  copied into these by `resource=migrate-legacy-loans`; until a row is
  copied it is still shown in its old form, and once copied the old row
  is hidden, so nothing is counted twice.

**Interest** is flat: share × rate per month × months, fixed at setup
(a yearly rate is spread over 12 months). A loan with a rate needs a
term. **Repayment plan** (optional): N equal monthly instalments on a due
day (the month's last day when shorter); each is the total ÷ N in whole
shillings and the last takes the remainder. Per split borrower the plan
is on their own share; on a joint loan it's on the whole. "Behind" is
what's fallen due less what's been paid. Repaid and overdue are derived,
never stored; overdue means the last due date has passed with money owed.

**Payments** go from a borrower to a lender. The receiver recording it
counts at once; the payer recording it is `pending` until the receiver
confirms or says they didn't receive it, and the payer can withdraw it
while pending. Amounts, people and dates are never edited; a mistaken
confirmed payment is for an admin to correct (no member path yet). A
payment can't take a share past what's owed. Home and Borrow show
"waiting for you" prompts for loans to answer and payments to confirm
(`loanPrompts` in `src/utils/loans.js`).

**Where the code is:** arithmetic in `api/_lib/loanMath.js` (pure; also
used by the New loan form's preview, and tested in
`src/utils/__tests__/loans.test.js`); reads, writes and every access
check in `api/_lib/loanAgreements.js`; the member endpoint is
`/api/external-holdings?resource=loans` (GET, and POST with an `action`:
create, answer, cancel, record-payment, decide-payment, cancel-payment)
because the Hobby plan's 12 functions are all used. Every action checks
the signed-in member is a party on that loan; a loan they're not on
answers 404. Admin: `resource=loan-agreements` (GET ?username, a member's
loans as they see them) and `resource=migrate-legacy-loans` (POST, safe
to re-run).

**Totals:** Home, Position and the journey screens all read
`totals.owedToYouMinor`/`youOweMinor` from the same endpoint, so they
can't drift apart. Only loans everyone has accepted count.

**Switching it on in production:** after deploying, run
`resource=migrate` (creates the three tables) and then
`resource=migrate-legacy-loans`. Before the tables exist, Borrow keeps
showing the older loans and New loan answers "not switched on yet".

## Hide balances

An eye button on Home's Total position card (and on Position, Savings,
Invest, Borrow, goal and loan screens) hides every amount at once, showing
`UGX ••••••` instead. It is one setting for the whole app, remembered per
device in localStorage (`nomad.hideBalances`); it is a privacy screen, not
security, since the API still returns the figures. Screens get masked
formatters from `useMoney()` (`src/hooks/useMoney.js`); amounts a member is
typing (deposit/withdraw keypad and confirm button, the yield calculator's
expanded inputs) deliberately stay visible. Any new screen showing a
balance should use `useMoney()`, not `fmt`/`ksh` directly.

## Shared screen components (`src/components/ui/`)

Screens used to repeat the same inline styles (30–50 per screen). The
recurring pieces now live once in `src/components/ui/` and screens import
them from `../components/ui`:

| Component | What it is |
|---|---|
| `Screen` | the padded page body every screen starts with |
| `ScreenTitle`, `BackTitle` | the Cinzel title; `BackTitle` adds the ← (or ✕ with `close`) that leaves the screen |
| `Eyebrow` | small uppercase tracked label (`tone="ink"` on dark cards, `top`/`bottom` for spacing) |
| `Amount` | the 32px headline figure |
| `ItemTitle`, `ItemMeta` | title and supporting line of a card or list row |
| `ActionLabel` | tracked action word (VIEW, FUND, OPEN) |
| `Card`, `InkCard` | the light card and the ink-green hero card with terrain |
| `TerrainBackdrop`, `Stack`, `ProgressBar` | terrain layer behind content, even-gap list, thin progress bar |

Rule of thumb: if a style block appears on a second screen, it belongs
here, not inline. One-off layout (a specific flex row, a margin) stays
inline in the screen. The refactor that introduced these changed no
visuals: every screen renders the same elements with the same styles.

## Journey preview (stage, balance sheet, spread)

A second look and a new set of screens, on for named members only while
it is tried out. Everyone else sees exactly the app as before.

**Who sees it.** `api/_lib/features.js`: the `JOURNEY_PREVIEW_USERS` env var
(comma-separated usernames, or `*` for everyone). Unset, it is on for
`niyigaba` alone. The session payload carries `user.features.journey`;
`App.jsx` (`JourneyPreview`) swaps Home and Invest and opens `/journey`,
`/trail` and `/balance-sheet` for those members, and `api/journey.js`
checks again server-side. To add a tester, set the env var in Vercel and
redeploy: no code change.

**What a member's stage is made of.** Nothing is stored. `utils/journeyModel.js`
derives everything from the accounts, holdings, loans and journey endpoints:

- *Independence* = passive income ÷ day-to-day costs (`utils/independence.js`).
  Passive income is each holding's value at its rate on record (a
  projection, labelled so on screen) plus passive income Nomad recorded.
- *Runway* = liquid fund ÷ monthly costs.
- *Stage* (`utils/placement.js`): the balance sheet decides when costs are
  on record; age is only a starting point until then; a Nomad override
  beats both. The seven stages and their stories are in `data/archetypes.js`.
- *Spread* (`utils/spread.js`): savings and investments by the currency
  each is held in (home / region / world), and holdings by sector.

Every threshold (stage cut-offs, next-level targets, spread guide ranges)
is in `src/config/journeyRules.js` and is **provisional**: none has been
set by an investment committee. `npm test` covers this logic.

**Entering a member's costs and income** (admin only for now; the member's
"Add a cost or income" button is shown but switched off):

```
POST /api/admin?resource=member-finances&token=…
{ "username": "niyigaba",
  "expenses": [{ "category": "rent", "amountMinor": 80000000, "frequency": "monthly", "effectiveFrom": "2026-11-01" }],
  "income":   [{ "label": "Salary", "kind": "active", "amountMinor": 480000000, "frequency": "monthly", "effectiveFrom": "2026-11-01" }] }
```

Categories: household, rent, school_fees, medical, transport, other.
Frequencies: monthly, termly (three a year), yearly. Amounts are minor
units (UGX × 100). Rows are append-only: to change a figure post a new row
with a later `effectiveFrom`; `amountMinor: 0` retires it. `"stage": "elder"`
overrides a member's stage, `"stage": null` lifts the override. `GET` with
`?username=` shows everything on record.

**Sector.** `external_holdings.sector` feeds the "By sector" card on Invest.
Add a column headed `Sector` to a member's Investments sheet and the daily
sync fills it; a blank cell clears it. It is the only column the sync finds
by name: **add it to the right of the existing columns, never between
them**, because the others are read by position.

**New tables** (all additive, in `db/schema.sql`): `member_expenses`,
`member_income`, `archetype_placements`, plus the `sector` column. Until
`resource=migrate` has been run, `api/journey.js` answers "nothing on
record" rather than failing, so the code can deploy first.

**Look.** The preview's rounder components are in `components/ui/Forward.jsx`
(ink header, soft cards, pill buttons, route bar), with `Icon.jsx` and
`StageTerrain.jsx` (a contour pattern per stage). Screens not yet moved
over (Save, Borrow and the rest) still use the hairline `Card` family, so
a preview member sees both looks for now.

## Known gaps / unfinished business

- **Confirm Mansa X actually landed in production.** It was seeded
  successfully in local dev. The production path went through a one-off
  GitHub Actions workflow (`.github/workflows/post-mansax-investment.yml`)
  after several rounds of debugging (see "Operational gotchas" below) —
  check whether the most recent run succeeded, and if so, **delete that
  workflow file**, it was explicitly a one-off.
- **`INVESTMENT_SHEETS` is not yet set in production.** The
  `sync-investments` cron will run and no-op (or error) until it's
  configured per the onboarding steps above.
- **Only Niyigaba Alvin's sheet has real investment data today.** The
  other 12 pilot users haven't been onboarded to investment tracking.
- **Vercel Authentication (SSO protection) was disabled this session** —
  it had been silently blocking *all* unauthenticated traffic to every
  `*.vercel.app` URL for this project (there's no custom domain
  configured), which meant nobody except the Vercel account owner could
  actually reach the app. This was necessary to unblock both the pilot
  users and the automation, but it's a real security posture change on a
  real-money app worth deliberately revisiting (e.g. Trusted IPs, or a
  proper custom domain with narrower protection) rather than leaving as
  "just off."
- **`SHEET_CSV_URL` (savings sync) vs the Drive-connector path** — worth
  double-checking which one is actually in active use; the code comment
  in `admin/index.js` says `post-entries` is "the primary path now,"
  implying `sync-sheet`/`SHEET_CSV_URL` may be a vestigial fallback.

## Operational gotchas (read this before doing admin/data work)

- **This environment cannot reach `*.vercel.app` directly.** Whoever picks
  this up next (Claude session or human) may hit the same wall: raw
  HTTP(S) calls to the production app's own API routes get rejected at
  the sandbox's egress policy level — this is unrelated to authentication
  or tokens, it's a network-level block on the domain. `git push` to
  GitHub is unaffected (Vercel's own infra pulls and deploys from GitHub,
  never touching this sandbox's network). If you need to call the
  *running* production API directly (not just deploy code), you need
  something with real network access — GitHub Actions runners work; a
  local machine works; this sandbox does not.
- **The GitHub token available in this environment (`GH_TOKEN`) can push
  code and read Actions run status/logs, but cannot trigger
  `workflow_dispatch`** (403 "Resource not accessible by integration") —
  a human has to click "Run workflow" in the GitHub UI.
- **GitHub Actions' log-download endpoint redirects to Azure Blob
  Storage**, which is also blocked from this sandbox — so raw workflow
  logs aren't readable via the API either. Workaround used: make workflow
  steps print the actual response status/body themselves (rather than
  relying on `curl -f`, which swallows the body on error) and fail loudly
  via `::error::` annotations, which *are* readable through the API even
  when the raw log isn't.
- **Vercel MCP connector project access can silently be empty** even when
  the connector shows "connected" — check `get_git_deployment_context`
  for `linkedProjects`; if it's `[]`, the connector needs to be
  reconnected with the right team/project scope selected at the Vercel
  OAuth consent screen, not just toggled on in Claude's settings.
- **There are 3 Vercel projects on this one GitHub repo** (see top of
  this doc) — always confirm you're looking at `nomad-app-hntl`
  specifically before trusting logs/settings/deployments.

## Local development

```bash
# Postgres and the dev server both need to be started fresh each session —
# they don't persist.
service postgresql start

DATABASE_URL="postgres://postgres:localdev@localhost:5432/nomad_app" \
ADMIN_TOKEN="local-test-token" \
npm run dev
```

- Dev server serves both the Vite frontend and the `/api/*` routes (see
  `dev/apiPlugin.mjs`) on `http://localhost:5173`.
- `npm run build` / `npm run lint` (oxlint) before pushing anything.
- **PWA updates:** `src/main.jsx` registers the service worker itself
  (`virtual:pwa-register`, `registerType: 'autoUpdate'`), so an open or
  home-screen app reloads once a new deploy's service worker activates, and
  checks for one hourly. Before this, the app kept serving its cached old
  build until fully closed and reopened — "I deployed but nothing changed"
  on a phone was usually that.
- **Playwright gotcha**: the username field on the login screen has no
  literal `type="text"` HTML attribute (the browser defaults it, but the
  attribute isn't in the DOM) — `input[type="text"]` as a CSS selector
  will hang forever. Select by position (`page.$$('input')`, first one)
  instead. The PIN keypad is `<div>` elements, not buttons —
  `div:text-is("1")` etc. Playwright browser: launch with
  `executablePath: '/opt/pw-browsers/chromium'`, run from
  `/opt/node22/lib/node_modules` (or wherever `playwright` is actually
  installed in your environment).

## Pilot roster

13 users. Real names/usernames live in the `users` table — not repeated
here since it's PII. Niyigaba Alvin (`niyigaba`) is the only user with
real investment data synced so far.
