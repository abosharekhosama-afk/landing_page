-- Generic tenant-scoped storefront analytics (search + visitors).
-- NOT executed as part of dashboard upgrade task; apply on staging after backup.

CREATE TABLE IF NOT EXISTS company_search_events (
  id UUID PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL DEFAULT '',
  term_normalized TEXT NOT NULL,
  term_display TEXT NOT NULL DEFAULT '',
  results_count INTEGER NOT NULL DEFAULT 0 CHECK (results_count >= 0),
  locale TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_search_redirects (
  id UUID PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  input_term_normalized TEXT NOT NULL,
  input_term_display TEXT NOT NULL DEFAULT '',
  target_term_normalized TEXT NOT NULL,
  target_term_display TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, input_term_normalized)
);

CREATE TABLE IF NOT EXISTS company_visitor_sessions (
  id UUID PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL DEFAULT '',
  session_key TEXT NOT NULL,
  visitor_key TEXT NOT NULL DEFAULT '',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  page_views INTEGER NOT NULL DEFAULT 0 CHECK (page_views >= 0),
  product_views INTEGER NOT NULL DEFAULT 0 CHECK (product_views >= 0),
  is_returning BOOLEAN NOT NULL DEFAULT false,
  last_path TEXT NOT NULL DEFAULT '',
  UNIQUE (company_id, site_id, session_key)
);

CREATE TABLE IF NOT EXISTS company_visitor_events (
  id UUID PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL DEFAULT '',
  session_key TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('pageview', 'product_view', 'heartbeat')),
  path TEXT NOT NULL DEFAULT '',
  product_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE company_search_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_search_redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_visitor_events ENABLE ROW LEVEL SECURITY;

-- Server-owned writes via privileged DATABASE_URL (same model as company_activity_logs).
CREATE POLICY "service_insert_search_events"
  ON company_search_events FOR INSERT WITH CHECK (true);
CREATE POLICY "service_insert_visitor_events"
  ON company_visitor_events FOR INSERT WITH CHECK (true);
CREATE POLICY "service_manage_visitor_sessions"
  ON company_visitor_sessions FOR ALL WITH CHECK (true);
CREATE POLICY "service_manage_search_redirects"
  ON company_search_redirects FOR ALL WITH CHECK (true);

CREATE POLICY "company_admins_select_search_events"
  ON company_search_events FOR SELECT
  USING (company_id = current_setting('app.current_company_id', true)::text);
CREATE POLICY "company_admins_select_search_redirects"
  ON company_search_redirects FOR SELECT
  USING (company_id = current_setting('app.current_company_id', true)::text);
CREATE POLICY "company_admins_select_visitor_sessions"
  ON company_visitor_sessions FOR SELECT
  USING (company_id = current_setting('app.current_company_id', true)::text);
CREATE POLICY "company_admins_select_visitor_events"
  ON company_visitor_events FOR SELECT
  USING (company_id = current_setting('app.current_company_id', true)::text);

CREATE INDEX IF NOT EXISTS idx_search_events_company_created
  ON company_search_events(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_events_company_term
  ON company_search_events(company_id, term_normalized);
CREATE INDEX IF NOT EXISTS idx_search_redirects_company_active
  ON company_search_redirects(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_company_last_seen
  ON company_visitor_sessions(company_id, site_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_events_company_created
  ON company_visitor_events(company_id, created_at DESC);
