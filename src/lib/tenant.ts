import { headers } from "next/headers";
import { cache } from "react";
import { listTenants } from "@/lib/tenant-store";
import { resolveTenant } from "@/lib/tenant-resolver";

export const getTenant = cache(async () => {
  const requestHeaders = await headers();
  const slug = requestHeaders.get("x-tenant-slug");
  const host = requestHeaders.get("x-tenant-host") ?? requestHeaders.get("host") ?? "localhost";
  const availableTenants = await listTenants();
  const tenant = slug
    ? availableTenants.find((candidate) => candidate.slug === slug)
    : resolveTenant(host, availableTenants);
  if (!tenant) throw new Error("Tenant not found");
  return tenant;
});
