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
| `external_holdings` | savings/investment products — `managed_by` is `'nomad'` (Nomad actually manages it, value comes from snapshots) or `'external'` (self-reported, `balance_minor` is a plain admin-updated number) |
| `investment_snapshots` | dated value history per `nomad`-managed holding — one row per (holding, date), re-posting the same date corrects it rather than duplicating |

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
- `external-holdings.js` — user-facing read of a user's holdings (the admin write path is separate, see below)

**Admin-only** (`api/admin/index.js`, gated by `ADMIN_TOKEN` query param or `CRON_SECRET` bearer token), dispatched by `?resource=`:
- `migrate` (GET) — applies `db/schema.sql`
- `external-holdings` (GET/POST/PATCH/DELETE) — create/update a holding; POST a dated snapshot via `snapshotDate`+`snapshotValueMinor` on PATCH for `nomad`-managed ones
- `user-profile` (PATCH) — bio-data fields
- `sync-sheet` (GET) — reads a published-CSV shared savings ledger sheet, posts new rows as ledger entries. Runs daily via Vercel Cron.
- `post-entries` (POST) — same validation as sync-sheet but takes pre-parsed rows directly (used when Claude reads a *private* sheet via the Drive connector and submits what it finds, avoiding "publish to web")
- `sync-investments` (GET) — **new this session**, see below. Runs daily via Vercel Cron.

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
