CREATE TABLE IF NOT EXISTS platform_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_config FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_config_admin ON platform_config;
CREATE POLICY platform_config_admin ON platform_config
  USING (current_platform_admin())
  WITH CHECK (current_platform_admin());
