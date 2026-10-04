export const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT,
  provider TEXT NOT NULL,
  provider_id TEXT,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  device_label TEXT,
  last_seen_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  onboarding_complete INTEGER NOT NULL DEFAULT 0,
  restriction_level TEXT NOT NULL DEFAULT 'medium',
  reflection_seconds INTEGER NOT NULL DEFAULT 15,
  cooldown_seconds INTEGER NOT NULL DEFAULT 86400,
  approval_required INTEGER NOT NULL DEFAULT 0,
  monitoring_enabled INTEGER NOT NULL DEFAULT 1,
  leaderboard_opt_in INTEGER NOT NULL DEFAULT 0,
  profile_visibility TEXT NOT NULL DEFAULT 'private',
  social_enabled INTEGER NOT NULL DEFAULT 1,
  notify_saved INTEGER NOT NULL DEFAULT 1,
  notify_approvals INTEGER NOT NULL DEFAULT 1,
  notify_challenges INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS onboarding_drafts (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS onboarding_responses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent INTEGER NOT NULL,
  payload TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS protected_sites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  category TEXT NOT NULL,
  enabled INTEGER NOT NULL,
  UNIQUE(user_id, domain)
);

CREATE TABLE IF NOT EXISTS pair_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  consumed_at TEXT
);

CREATE TABLE IF NOT EXISTS trusted_contacts (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL,
  token_hash TEXT UNIQUE,
  consent_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS friendships (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(requester_id, addressee_id)
);

CREATE TABLE IF NOT EXISTS friend_invites (
  id TEXT PRIMARY KEY,
  inviter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS interventions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  domain TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL,
  item_name TEXT,
  amount_cents INTEGER,
  decision TEXT NOT NULL,
  restriction_level TEXT NOT NULL,
  override_essential INTEGER NOT NULL DEFAULT 0,
  share_details INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS deferred_purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  intervention_id TEXT NOT NULL UNIQUE REFERENCES interventions(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  item_name TEXT,
  amount_cents INTEGER,
  saved_at TEXT NOT NULL,
  cooldown_until TEXT NOT NULL,
  status TEXT NOT NULL,
  notified_at TEXT,
  revisited_at TEXT
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  intervention_id TEXT NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL REFERENCES trusted_contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  responded_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS score_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  points INTEGER NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  explanation TEXT NOT NULL,
  intervention_id TEXT,
  deferred_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  goal_type TEXT NOT NULL,
  goal_count INTEGER NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS challenge_members (
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  joined_at TEXT,
  PRIMARY KEY (challenge_id, user_id)
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  subject_id TEXT,
  detail TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_interventions_user ON interventions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_scores_user ON score_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, kind);
`
