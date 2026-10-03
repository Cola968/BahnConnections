-- Apply only to a dedicated, configured billing database before enabling checkout.
-- Account/session creation belongs to the authentication provider, not the local profile.
CREATE TABLE IF NOT EXISTS billing_accounts (
  account_id TEXT PRIMARY KEY,
  stripe_customer_id TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS billing_sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES billing_accounts(account_id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS billing_webhook_events (
  event_id TEXT PRIMARY KEY,
  processed_at INTEGER NOT NULL
);
