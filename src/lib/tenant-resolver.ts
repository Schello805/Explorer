import type { Tenant } from "@/lib/types";

export function resolveTenant(host: string, availableTenants: Tenant[]): Tenant | undefined {
  const normalizedHost = host.split(":")[0].toLowerCase();
  const tenant = availableTenants.find((candidate) =>
    candidate.hosts.includes(normalizedHost)
  );
  if (tenant) return tenant;
  const subdomain = normalizedHost.split(".")[0];
  return availableTenants.find((candidate) => candidate.slug === subdomain)
    ?? availableTenants[0];
}

export function isPlatformHost(host: string): boolean {
  const normalizedHost = host.split(":")[0].toLowerCase();
  return normalizedHost === "localhost"
    || normalizedHost === "127.0.0.1"
    || normalizedHost.startsWith("192.168.")
    || normalizedHost.startsWith("10.")
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalizedHost);
}

export function onlyTenantRecords<T extends { tenantId: string }>(
  tenantId: string,
  records: T[]
): T[] {
  if (!tenantId) throw new Error("Tenant context is required");
  return records.filter((record) => record.tenantId === tenantId);
}
