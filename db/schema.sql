-- Nomad customer app — core schema.
-- Money is always bigint minor units (KSh * 100). Never a float.
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
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts(user_id);

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
