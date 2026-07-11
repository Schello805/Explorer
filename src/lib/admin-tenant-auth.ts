import { canManageTenant, canViewTenant, type AppSession } from "@/lib/auth";
import { resolveTenant } from "@/lib/tenant-resolver";
import type { Tenant } from "@/lib/types";

type AccessMode = "manage" | "view";

export function resolveAdminTenant(host: string, tenants: Tenant[], session: AppSession, access: AccessMode = "manage") {
  const normalized = host.split(":")[0].toLowerCase();
  const domainTenant = tenants.find((candidate) => candidate.hosts.includes(normalized))
    ?? tenants.find((candidate) => candidate.slug === normalized.split(".")[0])
    ?? resolveTenant(host, tenants);

  if (domainTenant && hasTenantAccess(session, domainTenant.id, access)) return domainTenant;
  return tenants.find((tenant) => hasTenantAccess(session, tenant.id, access));
}

function hasTenantAccess(session: AppSession, tenantId: string, access: AccessMode) {
  return access === "manage" ? canManageTenant(session, tenantId) : canViewTenant(session, tenantId);
}
