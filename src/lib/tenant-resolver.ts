import { tenants } from "@/lib/demo-data";
import type { Tenant } from "@/lib/types";

export function resolveTenant(host: string, availableTenants: Tenant[] = tenants): Tenant {
  const normalizedHost = host.split(":")[0].toLowerCase();
  const tenant = availableTenants.find((candidate) =>
    candidate.hosts.includes(normalizedHost)
  );
  if (tenant) return tenant;
  const subdomain = normalizedHost.split(".")[0];
  return availableTenants.find((candidate) => candidate.slug === subdomain)
    ?? availableTenants[0]
    ?? tenants[0];
}

export function onlyTenantRecords<T extends { tenantId: string }>(
  tenantId: string,
  records: T[]
): T[] {
  if (!tenantId) throw new Error("Tenant context is required");
  return records.filter((record) => record.tenantId === tenantId);
}
