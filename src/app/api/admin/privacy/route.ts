import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { canManageTenant, canViewTenant, verifyAdminSession } from "@/lib/auth";
import { resolveAdminTenant } from "@/lib/admin-tenant-auth";
import { createPrivacyRequest, exportTenantData, listTenants, markTenantForDeletion } from "@/lib/tenant-store";

async function authorize() {
  const cookieStore = await cookies();
  const session = await verifyAdminSession(
    cookieStore.get("platzguide_session")?.value ?? cookieStore.get("explorer_session")?.value
  );
  if (!session) return null;
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost";
  const tenants = await listTenants();
  const tenant = resolveAdminTenant(host, tenants, session, "view");
  if (!tenant) return null;
  return { session, tenant, tenants };
}

export async function GET(request: Request) {
  const authorization = await authorize();
  const tenantId = new URL(request.url).searchParams.get("tenantId") ?? authorization?.tenant.id;
  const targetTenant = authorization?.tenants.find((tenant) => tenant.id === tenantId);
  if (!authorization || !targetTenant || !canViewTenant(authorization.session, targetTenant.id)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  return NextResponse.json(await exportTenantData(targetTenant.id));
}

export async function POST(request: Request) {
  const authorization = await authorize();
  const body = await request.json().catch(() => ({}));
  const targetTenant = authorization?.tenants.find((tenant) => tenant.id === (body.tenantId ?? authorization.tenant.id));
  if (!authorization || !targetTenant || !canManageTenant(authorization.session, targetTenant.id)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  if (body.type === "delete") {
    return NextResponse.json(await markTenantForDeletion(targetTenant.id, authorization.session.email));
  }
  return NextResponse.json(await createPrivacyRequest(targetTenant.id, authorization.session.email, "export"));
}
