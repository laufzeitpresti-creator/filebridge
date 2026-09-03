-- Production Postgres only. PGlite/local file DB does not need this.
-- DATABASE_URL stays server-side. Never expose it as NEXT_PUBLIC_*.
-- If you later switch to Supabase, use the anon key in the browser and keep
-- the service-role key server-only, with these policies as the source of truth.

ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS connections_isolation ON connections;
CREATE POLICY connections_isolation ON connections
  USING (user_id = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS transfers_isolation ON transfers;
CREATE POLICY transfers_isolation ON transfers
  USING (user_id = current_setting('app.current_user_id', true));

-- Table owner bypasses RLS. Use a non-owner role in production:
-- GRANT SELECT, INSERT, UPDATE, DELETE ON connections, transfers TO filebridge_app;
