-- Apply with: psql "$DATABASE_URL" -f drizzle/0001_init.sql
-- or: npm run db:push

CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  kind text NOT NULL,
  name text NOT NULL,
  encrypted_config text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS connections_user_idx ON connections (user_id);

CREATE TABLE IF NOT EXISTS transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  source_connection_id uuid NOT NULL REFERENCES connections(id) ON DELETE RESTRICT,
  dest_connection_id uuid NOT NULL REFERENCES connections(id) ON DELETE RESTRICT,
  source_path text NOT NULL,
  dest_path text NOT NULL,
  file_name text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  bytes_copied bigint NOT NULL DEFAULT 0,
  bytes_total bigint,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transfers_user_idx ON transfers (user_id);
CREATE INDEX IF NOT EXISTS transfers_status_idx ON transfers (status);
