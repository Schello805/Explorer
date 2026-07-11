import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizePlatformAdmin } from "@/lib/platform-admin";
import { archiveTenant, deleteTenantPermanently, listTenants, reactivateTenant } from "@/lib/tenant-store";

const lifecycleSchema = z.object({
  tenantId: z.string().uuid(),
  action: z.enum(["archive", "reactivate", "delete"])
});

export async function POST(request: Request) {
  const session = await authorizePlatformAdmin();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const parsed = lifecycleSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Mandantenaktion" }, { status: 400 });
  const targetTenant = (await listTenants()).find((tenant) => tenant.id === parsed.data.tenantId);
  if (!targetTenant) return NextResponse.json({ error: "Mandant nicht gefunden" }, { status: 404 });

  if (parsed.data.action === "archive") {
    const tenant = await archiveTenant(targetTenant.id, session.email);
    return NextResponse.json({ tenant });
  }
  if (parsed.data.action === "reactivate") {
    const tenant = await reactivateTenant(targetTenant.id, session.email);
    return NextResponse.json({ tenant });
  }

  await deleteTenantPermanently(targetTenant.id, session.email);
  return NextResponse.json({ deleted: true, tenantId: targetTenant.id });
}
