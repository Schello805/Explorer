import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeTenantAdmin } from "@/lib/admin-session";
import { publishTenant, rollbackTenant } from "@/lib/publishing";

const publishSchema = z.object({
  tenantId: z.string().uuid(),
  action: z.enum(["publish", "rollback"]),
  versionId: z.string().optional()
});

export async function POST(request: Request) {
  const parsed = publishSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Veröffentlichungsaktion." }, { status: 400 });
  const authorization = await authorizeTenantAdmin(parsed.data.tenantId);
  if (!authorization) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  if (parsed.data.action === "publish") {
    if (authorization.tenant.billing.status !== "active" || !authorization.tenant.billing.publicEnabled) {
      return NextResponse.json({ error: "Für die Veröffentlichung ist ein aktives Abo oder eine Superadmin-Freigabe nötig." }, { status: 403 });
    }
    if (!authorization.tenant.map.configured || authorization.tenant.stations.filter((station) => !station.isTemplate).length < 1) {
      return NextResponse.json({ error: "Bitte zuerst Kartenbereich und mindestens eine Station einrichten." }, { status: 400 });
    }
    return NextResponse.json(await publishTenant(authorization.tenant, authorization.session.email));
  }
  if (!parsed.data.versionId) return NextResponse.json({ error: "Version fehlt." }, { status: 400 });
  return NextResponse.json(await rollbackTenant(authorization.tenant, parsed.data.versionId, authorization.session.email));
}
