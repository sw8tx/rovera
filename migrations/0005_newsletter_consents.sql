CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id TEXT NOT NULL UNIQUE,
  email TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('subscribed', 'unsubscribed')),
  consented_at INTEGER,
  consent_source TEXT,
  consent_version TEXT,
  unsubscribed_at INTEGER,
  CHECK (
    (status = 'subscribed' AND consented_at IS NOT NULL AND consent_source IS NOT NULL AND consent_version IS NOT NULL AND unsubscribed_at IS NULL)
    OR (status = 'unsubscribed' AND unsubscribed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS newsletter_subscriptions_send_check_idx
  ON newsletter_subscriptions(status, email);
