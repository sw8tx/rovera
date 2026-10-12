CREATE TABLE IF NOT EXISTS auth_email_challenges (
  challenge_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 5),
  consumed_at INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_email_challenges_one_active_email_idx
  ON auth_email_challenges(email) WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS auth_email_challenges_expiry_idx
  ON auth_email_challenges(expires_at);
