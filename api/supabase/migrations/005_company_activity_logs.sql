CREATE TABLE IF NOT EXISTS company_activity_logs (
  id UUID PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL,
  actor_email TEXT NOT NULL DEFAULT '',
  actor_name TEXT NOT NULL DEFAULT '',
  actor_role TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  entity_label TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  before_data JSONB DEFAULT NULL,
  after_data JSONB DEFAULT NULL,
  metadata JSONB DEFAULT NULL,
  ip_address TEXT DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE company_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_activity_logs_company_id ON company_activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON company_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON company_activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON company_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_email ON company_activity_logs(actor_email);

-- Company admin access policy
CREATE POLICY "company_admins_select_own_logs"
  ON company_activity_logs
  FOR SELECT
  USING (company_id = current_setting('app.current_company_id', true)::text);

-- Only the server application writes logs; allow all inserts
CREATE POLICY "service_insert_activity_logs"
  ON company_activity_logs
  FOR INSERT
  WITH CHECK (true);
