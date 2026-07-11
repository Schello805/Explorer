import { NextResponse } from "next/server";
import { authorizePlatformAdmin } from "@/lib/platform-admin";
import { listTenants } from "@/lib/tenant-store";

export async function GET() {
  const session = await authorizePlatformAdmin();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const tenants = await listTenants();
  const entries = tenants
    .flatMap((tenant) => tenant.auditLog.map((entry) => ({ ...entry, tenantName: tenant.name, tenantSlug: tenant.slug })))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 100);
  return NextResponse.json({ entries, checkedAt: new Date().toISOString() });
}
