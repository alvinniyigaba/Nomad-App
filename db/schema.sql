-- Nomad customer app — core schema.
-- Money is always bigint minor units (UGX * 100). Never a float.
-- Balances are never stored directly — they are sum(amount_minor) over
-- ledger_entries for the account. The ledger is append-only.

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  pin_hash text,
  name text NOT NULL,
  surname text NOT NULL,
  phone_masked text NOT NULL,
  email text NOT NULL,
  member_since_year int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  pin_verified_at timestamptz,
  failed_pin_attempts int NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);

-- One row per savings goal ('goal') or the liquid emergency fund ('liquid').
-- user_id is the owner for an individual account, or the creator for a
-- group account — group membership/roles live in account_members.
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('goal', 'liquid')),
  name text NOT NULL,
  target_minor bigint,
  target_date date,
  auto_save_enabled boolean NOT NULL DEFAULT false,
  auto_save_amount_minor bigint,
  auto_save_day int,
  auto_save_rail text,
  pledged_minor bigint NOT NULL DEFAULT 0,
  pledge_unlocks_date date,
  is_group boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts(user_id);
-- Belt and suspenders for a DB that already had the accounts table before
-- is_group existed — CREATE TABLE IF NOT EXISTS above is a no-op there.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_group boolean NOT NULL DEFAULT false;

-- Membership + role for group accounts only. An individual account has no
-- rows here — ownership is accounts.user_id, same as before.
CREATE TABLE IF NOT EXISTS account_members (
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, user_id)
);
CREATE INDEX IF NOT EXISTS account_members_user_id_idx ON account_members(user_id);

-- Append-only. Never UPDATE or DELETE a posted entry — post a reversing
-- entry instead. amount_minor is signed: positive = credit, negative = debit.
CREATE TABLE IF NOT EXISTS ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_minor bigint NOT NULL,
  kind text NOT NULL CHECK (kind IN ('auto_save', 'topup', 'interest', 'withdrawal', 'adjustment')),
  rail text,
  memo text,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ledger_entries_account_id_idx ON ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS ledger_entries_user_id_idx ON ledger_entries(user_id);

CREATE TABLE IF NOT EXISTS kyc_status (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone_verified boolean NOT NULL DEFAULT true,
  id_matched boolean NOT NULL DEFAULT true,
  selfie_done boolean NOT NULL DEFAULT false,
  source_of_funds_done boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_statements boolean NOT NULL DEFAULT true,
  face_id boolean NOT NULL DEFAULT true,
  push boolean NOT NULL DEFAULT true,
  language text NOT NULL DEFAULT 'en',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Savings/investment products Nomad does not manage. Purely informational —
-- self-reported by the user to Nomad and entered by an admin, never touches
-- ledger_entries because no real money moves through Nomad for these.
CREATE TABLE IF NOT EXISTS external_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_name text NOT NULL,
  product_type text NOT NULL CHECK (product_type IN ('savings', 'fixed_deposit', 'investment', 'other')),
  balance_minor bigint,
  interest_rate_bps int,
  term_months int,
  maturity_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS external_holdings_user_id_idx ON external_holdings(user_id);
