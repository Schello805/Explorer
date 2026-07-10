CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT nullif(current_setting('app.tenant_id', true), '')::uuid $$;

CREATE OR REPLACE FUNCTION current_platform_admin() RETURNS boolean
LANGUAGE sql STABLE
AS $$ SELECT current_setting('app.platform_admin', true) = 'true' $$;

CREATE TABLE IF NOT EXISTS stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stations_status CHECK (status IN ('open', 'closed', 'limited', 'maintenance'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_email text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  changes jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users FORCE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets FORCE ROW LEVEL SECURITY;
ALTER TABLE privacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_self ON tenants;
CREATE POLICY tenant_self ON tenants
  USING (current_platform_admin() OR id = current_tenant_id())
  WITH CHECK (current_platform_admin() OR id = current_tenant_id());

DROP POLICY IF EXISTS tenant_stations ON stations;
CREATE POLICY tenant_stations ON stations
  USING (current_platform_admin() OR tenant_id = current_tenant_id())
  WITH CHECK (current_platform_admin() OR tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_users_policy ON tenant_users;
CREATE POLICY tenant_users_policy ON tenant_users
  USING (current_platform_admin() OR tenant_id = current_tenant_id())
  WITH CHECK (current_platform_admin() OR tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_media_assets ON media_assets;
CREATE POLICY tenant_media_assets ON media_assets
  USING (current_platform_admin() OR tenant_id = current_tenant_id())
  WITH CHECK (current_platform_admin() OR tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_privacy_requests ON privacy_requests;
CREATE POLICY tenant_privacy_requests ON privacy_requests
  USING (current_platform_admin() OR tenant_id = current_tenant_id())
  WITH CHECK (current_platform_admin() OR tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_audit_log ON audit_log;
CREATE POLICY tenant_audit_log ON audit_log
  USING (current_platform_admin() OR tenant_id = current_tenant_id())
  WITH CHECK (current_platform_admin() OR tenant_id = current_tenant_id());

CREATE INDEX IF NOT EXISTS stations_tenant_id_idx ON stations(tenant_id);
CREATE INDEX IF NOT EXISTS audit_log_tenant_created_idx ON audit_log(tenant_id, created_at DESC);
