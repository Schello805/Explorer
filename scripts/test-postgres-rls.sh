#!/usr/bin/env bash
set -Eeuo pipefail

DATABASE_URL="${DATABASE_URL:-}"

fail() { printf '\033[1;31m[FEHLER]\033[0m %s\n' "$*" >&2; exit 1; }
ok() { printf '\033[1;32m[OK]\033[0m %s\n' "$*"; }

[[ -n "${DATABASE_URL}" ]] || fail "DATABASE_URL fehlt."
command -v psql >/dev/null 2>&1 || fail "psql fehlt."

result="$(psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -At <<'SQL'
DO $$
DECLARE
  tenant_a uuid := gen_random_uuid();
  tenant_b uuid := gen_random_uuid();
  visible_count int;
BEGIN
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
SELECT 'rls-ok';
SQL
)"

[[ "${result}" == *"rls-ok"* ]] || fail "RLS-Test fehlgeschlagen."
ok "RLS-Test erfolgreich."
