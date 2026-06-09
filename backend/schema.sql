-- Schema based on conceptual ERD (Kazan geo-messenger)

BEGIN;

CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_emoji VARCHAR(16)
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON users(is_blocked);

-- Ensure column exists if table was created earlier.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_emoji VARCHAR(16);

CREATE TABLE IF NOT EXISTS event_types (
  type_id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  icon_url TEXT,
  color_code VARCHAR(7) DEFAULT '#1976D2' CHECK (color_code ~ '^#[0-9A-Fa-f]{6}$'),
  description TEXT
);

CREATE TABLE IF NOT EXISTS events (
  event_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type_id INTEGER NOT NULL REFERENCES event_types(type_id) ON DELETE RESTRICT,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  latitude NUMERIC(10, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  address VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  archived_at TIMESTAMPTZ
);

-- Ensure column exists if table was created earlier.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_events_type_id ON events(type_id);
CREATE INDEX IF NOT EXISTS idx_events_archived ON events(is_archived);
CREATE INDEX IF NOT EXISTS idx_events_active ON events(is_active);
CREATE INDEX IF NOT EXISTS idx_events_lat_lng ON events(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_events_expires_at ON events(expires_at);

CREATE TABLE IF NOT EXISTS comments (
  comment_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

-- Ensure columns exist if table was created earlier.
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_comments_event ON comments(event_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);

CREATE TABLE IF NOT EXISTS comment_likes (
  like_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  comment_id INTEGER NOT NULL REFERENCES comments(comment_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_comment_like UNIQUE (user_id, comment_id)
);

CREATE TABLE IF NOT EXISTS user_blocks (
  block_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  blocked_by INTEGER NOT NULL REFERENCES users(user_id),
  reason TEXT,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unblock_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Ensure columns exist if table was created earlier.
ALTER TABLE user_blocks
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE user_blocks
  ADD COLUMN IF NOT EXISTS unblock_at TIMESTAMPTZ;
ALTER TABLE user_blocks
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_user_blocks_active ON user_blocks(is_active);

CREATE TABLE IF NOT EXISTS report_reasons (
  reason_id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 10)
);

CREATE TABLE IF NOT EXISTS reports (
  report_id SERIAL PRIMARY KEY,
  reporter_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  reported_user_id INTEGER REFERENCES users(user_id),
  event_id INTEGER REFERENCES events(event_id),
  comment_id INTEGER REFERENCES comments(comment_id),
  reason_id INTEGER NOT NULL REFERENCES report_reasons(reason_id) ON DELETE RESTRICT,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by INTEGER REFERENCES users(user_id),
  CONSTRAINT chk_report_target CHECK (
    reported_user_id IS NOT NULL OR event_id IS NOT NULL OR comment_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_event ON reports(event_id);
CREATE INDEX IF NOT EXISTS idx_reports_comment ON reports(comment_id);

COMMIT;
