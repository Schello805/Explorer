import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeTenantAdmin } from "@/lib/admin-session";
import { applyTenantBundle, createTenantBundle } from "@/lib/tenant-bundle";
import { saveTenantConfiguration } from "@/lib/tenant-store";

const importSchema = z.object({
  tenantId: z.string().uuid(),
  bundle: z.unknown()
});

export async function GET(request: Request) {
  const tenantId = new URL(request.url).searchParams.get("tenantId") ?? "";
  const authorization = await authorizeTenantAdmin(tenantId);
  if (!authorization) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const bundle = createTenantBundle(authorization.tenant);
  return new NextResponse(JSON.stringify(bundle, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="platzguide-${authorization.tenant.slug}-export.json"`
    }
  });
}

export async function POST(request: Request) {
  const parsed = importSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Bitte Bundle und Mandant prüfen." }, { status: 400 });
  const authorization = await authorizeTenantAdmin(parsed.data.tenantId);
  if (!authorization) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  try {
    const tenant = applyTenantBundle(authorization.tenant, parsed.data.bundle as never);
    const saved = await saveTenantConfiguration(authorization.tenant.id, tenant, authorization.session.email);
    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Bundle konnte nicht importiert werden." }, { status: 400 });
  }
}
