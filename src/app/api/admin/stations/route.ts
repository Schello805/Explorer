import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageTenant, verifyAdminSession } from "@/lib/auth";
import { resolveAdminTenant } from "@/lib/admin-tenant-auth";
import { deleteStation, listTenants, saveStation } from "@/lib/tenant-store";

const stationSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().uuid(),
  categoryId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  shortDescription: z.string().max(240),
  description: z.string().max(10000),
  openingHours: z.string().max(200),
  status: z.enum(["open", "closed", "limited", "maintenance"]),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  position: z.object({ x: z.number(), y: z.number() }),
  image: z.string().max(2000),
  featured: z.boolean().optional(),
  isTemplate: z.boolean().optional()
});

async function authorize() {
  const cookieStore = await cookies();
  const session = await verifyAdminSession(
    cookieStore.get("platzguide_session")?.value ?? cookieStore.get("explorer_session")?.value
  );
  if (!session) return null;
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost";
  const tenants = await listTenants();
  const tenant = resolveAdminTenant(host, tenants, session);
  if (!tenant) return null;
  return canManageTenant(session, tenant.id) ? { session, tenant, tenants } : null;
}

export async function POST(request: Request) {
  const authorization = await authorize();
  if (!authorization) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const parsed = stationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Stationsdaten", details: parsed.error.flatten() }, { status: 400 });
  const targetTenant = authorization.tenants.find((tenant) => tenant.id === parsed.data.tenantId);
  if (!targetTenant || !canManageTenant(authorization.session, targetTenant.id)) {
    return NextResponse.json({ error: "Mandantenzugriff verweigert" }, { status: 403 });
  }
  return NextResponse.json(await saveStation(targetTenant.id, parsed.data, authorization.session.email));
}

export async function DELETE(request: Request) {
  const authorization = await authorize();
  if (!authorization) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const parameters = new URL(request.url).searchParams;
  const id = parameters.get("id");
  const tenantId = parameters.get("tenantId") ?? authorization.tenant.id;
  if (!id) return NextResponse.json({ error: "Stations-ID fehlt" }, { status: 400 });
  const targetTenant = authorization.tenants.find((tenant) => tenant.id === tenantId);
  if (!targetTenant || !canManageTenant(authorization.session, targetTenant.id)) {
    return NextResponse.json({ error: "Mandantenzugriff verweigert" }, { status: 403 });
  }
  await deleteStation(targetTenant.id, id, authorization.session.email);
  return NextResponse.json({ ok: true });
}
