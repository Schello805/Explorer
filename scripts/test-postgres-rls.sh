#!/usr/bin/env bash
set -Eeuo pipefail

DATABASE_URL="${DATABASE_URL:-}"

fail() { printf '\033[1;31m[FEHLER]\033[0m %s\n' "$*" >&2; exit 1; }
ok() { printf '\033[1;32m[OK]\033[0m %s\n' "$*"; }

[[ -n "${DATABASE_URL}" ]] || fail "DATABASE_URL fehlt."
command -v psql >/dev/null 2>&1 || fail "psql fehlt."

result="$(psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -At <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'platzguide_rls_check') THEN
    CREATE ROLE platzguide_rls_check;
  END IF;
  ALTER ROLE platzguide_rls_check NOSUPERUSER NOBYPASSRLS;
  GRANT USAGE ON SCHEMA public TO platzguide_rls_check;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO platzguide_rls_check;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO platzguide_rls_check;
  GRANT platzguide_rls_check TO CURRENT_USER;
END $$;

SET ROLE platzguide_rls_check;

DO $$
DECLARE
  tenant_a uuid := gen_random_uuid();
  tenant_b uuid := gen_random_uuid();
  visible_count int;
BEGIN
  PERFORM set_config('app.platform_admin', 'false', true);
  PERFORM set_config('app.tenant_id', tenant_a::text, true);
  INSERT INTO tenants (id, slug, name, hosts, configuration)
  VALUES (tenant_a, 'rls-a-' || left(tenant_a::text, 8), 'RLS A', ARRAY['rls-a.local'], jsonb_build_object('id', tenant_a));
  INSERT INTO stations (tenant_id, category_id, name, latitude, longitude, data)
  VALUES (tenant_a, 'test', 'A', 1, 1, '{}');

  PERFORM set_config('app.tenant_id', tenant_b::text, true);
  INSERT INTO tenants (id, slug, name, hosts, configuration)
  VALUES (tenant_b, 'rls-b-' || left(tenant_b::text, 8), 'RLS B', ARRAY['rls-b.local'], jsonb_build_object('id', tenant_b));
  INSERT INTO stations (tenant_id, category_id, name, latitude, longitude, data)
  VALUES (tenant_b, 'test', 'B', 1, 1, '{}');

  SELECT count(*) INTO visible_count FROM stations WHERE tenant_id = tenant_a;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'RLS leak: tenant_b can see tenant_a stations';
  END IF;
END $$;

RESET ROLE;
SET ROLE platzguide_rls_check;

DO $$
DECLARE
  tenant_a uuid := gen_random_uuid();
  tenant_b uuid := gen_random_uuid();
  visible_count int;
BEGIN
  PERFORM set_config('app.platform_admin', 'true', true);
  PERFORM set_config('app.tenant_id', tenant_b::text, true);
  INSERT INTO tenants (id, slug, name, hosts, configuration)
  VALUES (tenant_a, 'rls-admin-a-' || left(tenant_a::text, 8), 'RLS Admin A', ARRAY['rls-admin-a.local'], jsonb_build_object('id', tenant_a));
  INSERT INTO tenants (id, slug, name, hosts, configuration)
  VALUES (tenant_b, 'rls-admin-b-' || left(tenant_b::text, 8), 'RLS Admin B', ARRAY['rls-admin-b.local'], jsonb_build_object('id', tenant_b));
  SELECT count(*) INTO visible_count FROM tenants WHERE id IN (tenant_a, tenant_b);
  IF visible_count <> 2 THEN
    RAISE EXCEPTION 'platform admin policy cannot see all tenants';
  END IF;
END $$;

RESET ROLE;

SELECT 'rls-ok';
SQL
)"

[[ "${result}" == *"rls-ok"* ]] || fail "RLS-Test fehlgeschlagen."
ok "RLS-Test erfolgreich."
