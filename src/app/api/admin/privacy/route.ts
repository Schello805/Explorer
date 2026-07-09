import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { canManageTenant, canViewTenant, verifyAdminSession } from "@/lib/auth";
import { resolveTenant } from "@/lib/tenant-resolver";
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
  const normalized = host.split(":")[0];
  const tenant = tenants.find((candidate) => candidate.hosts.includes(normalized))
    ?? tenants.find((candidate) => candidate.slug === normalized.split(".")[0])
    ?? resolveTenant(host, tenants);
  return { session, tenant };
}

export async function GET() {
  const authorization = await authorize();
  if (!authorization || !canViewTenant(authorization.session, authorization.tenant.id)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  return NextResponse.json(await exportTenantData(authorization.tenant.id));
}

export async function POST(request: Request) {
  const authorization = await authorize();
  if (!authorization || !canManageTenant(authorization.session, authorization.tenant.id)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  if (body.type === "delete") {
    return NextResponse.json(await markTenantForDeletion(authorization.tenant.id, authorization.session.email));
  }
  return NextResponse.json(await createPrivacyRequest(authorization.tenant.id, authorization.session.email, "export"));
}
