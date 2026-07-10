CREATE TABLE IF NOT EXISTS tenant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL,
  password_hash text,
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_users_role CHECK (role IN ('tenant-owner', 'tenant-editor', 'tenant-viewer')),
  UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  type text NOT NULL,
  alt text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_assets_type CHECK (type IN ('image', 'document', 'video'))
);

CREATE TABLE IF NOT EXISTS privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT privacy_requests_type CHECK (type IN ('export', 'delete')),
  CONSTRAINT privacy_requests_status CHECK (status IN ('new', 'processing', 'done', 'rejected'))
);

ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users FORCE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets FORCE ROW LEVEL SECURITY;
ALTER TABLE privacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_requests FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_users_policy ON tenant_users;
CREATE POLICY tenant_users_policy ON tenant_users
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_media_assets ON media_assets;
CREATE POLICY tenant_media_assets ON media_assets
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_privacy_requests ON privacy_requests;
CREATE POLICY tenant_privacy_requests ON privacy_requests
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE INDEX IF NOT EXISTS tenant_users_tenant_email_idx ON tenant_users(tenant_id, email);
CREATE INDEX IF NOT EXISTS media_assets_tenant_created_idx ON media_assets(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS privacy_requests_tenant_created_idx ON privacy_requests(tenant_id, created_at DESC);
