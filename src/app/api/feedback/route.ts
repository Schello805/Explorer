import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveTenant } from "@/lib/tenant-resolver";
import { listTenants, saveFeedback } from "@/lib/tenant-store";

const feedbackSchema = z.object({
  stationId: z.string().optional(),
  message: z.string().trim().min(5).max(2000),
  contact: z.string().trim().max(160).optional()
});

export async function POST(request: Request) {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost";
  const tenants = await listTenants();
  const tenant = resolveTenant(host, tenants);
  if (!tenant) return NextResponse.json({ error: "Mandant nicht gefunden" }, { status: 404 });
  if (!tenant.features.feedback) return NextResponse.json({ error: "Feedback ist deaktiviert" }, { status: 403 });
  const parsed = feedbackSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Meldung" }, { status: 400 });
  await saveFeedback(tenant.id, parsed.data);
  return NextResponse.json({ ok: true });
}
