CREATE TABLE IF NOT EXISTS auth_welcome_emails (
  user_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  created_at INTEGER NOT NULL,
  sent_at INTEGER
);
