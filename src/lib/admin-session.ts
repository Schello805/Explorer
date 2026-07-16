import "server-only";

import { cookies, headers } from "next/headers";
import { canManageTenant, verifyAdminSession } from "@/lib/auth";
import { resolveAdminTenant } from "@/lib/admin-tenant-auth";
import { listTenants } from "@/lib/tenant-store";

export async function authorizeTenantAdmin(tenantId?: string) {
  const cookieStore = await cookies();
  const session = await verifyAdminSession(
    cookieStore.get("platzguide_session")?.value ?? cookieStore.get("explorer_session")?.value
  );
  if (!session) return null;
  const tenants = await listTenants();
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost";
  const resolvedTenant = tenantId
    ? tenants.find((tenant) => tenant.id === tenantId)
    : resolveAdminTenant(host, tenants, session);
  if (!resolvedTenant || !canManageTenant(session, resolvedTenant.id)) return null;
  return { session, tenant: resolvedTenant, tenants };
}
