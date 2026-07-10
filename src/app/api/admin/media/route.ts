import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageTenant, verifyAdminSession } from "@/lib/auth";
import { resolveTenant } from "@/lib/tenant-resolver";
import { listTenants, saveTenantConfiguration } from "@/lib/tenant-store";

const mediaSchema = z.object({
  tenantId: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(120),
  url: z.string().trim().url().max(2000),
  type: z.enum(["image", "document", "video"]),
  alt: z.string().trim().max(240)
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
  const normalized = host.split(":")[0];
  const tenant = tenants.find((candidate) => candidate.hosts.includes(normalized))
    ?? tenants.find((candidate) => candidate.slug === normalized.split(".")[0])
    ?? resolveTenant(host, tenants);
  return canManageTenant(session, tenant.id) ? { session, tenant, tenants } : null;
}

export async function POST(request: Request) {
  const authorization = await authorize();
  if (!authorization) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const parsed = mediaSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Mediendaten" }, { status: 400 });
  const targetTenant = parsed.data.tenantId ? authorization.tenants.find((tenant) => tenant.id === parsed.data.tenantId) : authorization.tenant;
  if (!targetTenant || !canManageTenant(authorization.session, targetTenant.id)) {
    return NextResponse.json({ error: "Mandantenzugriff verweigert" }, { status: 403 });
  }
  const media = {
    id: crypto.randomUUID(),
    tenantId: targetTenant.id,
    createdAt: new Date().toISOString(),
    title: parsed.data.title,
    url: parsed.data.url,
    type: parsed.data.type,
    alt: parsed.data.alt
  };
  const tenant = await saveTenantConfiguration(targetTenant.id, {
    ...targetTenant,
    media: [media, ...targetTenant.media].slice(0, 500)
  }, authorization.session.email);
  return NextResponse.json(tenant.media[0]);
}
