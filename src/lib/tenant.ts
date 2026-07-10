import { headers } from "next/headers";
import { cache } from "react";
import { listTenants } from "@/lib/tenant-store";
import { resolveTenant } from "@/lib/tenant-resolver";

export const getTenant = cache(async () => {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-tenant-host") ?? requestHeaders.get("host") ?? "localhost";
  const availableTenants = await listTenants();
  const tenant = resolveTenant(host, availableTenants);
  if (!tenant) throw new Error("Tenant not found");
  return tenant;
});
