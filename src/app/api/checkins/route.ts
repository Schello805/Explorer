import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { resolveTenant } from "@/lib/tenant-resolver";
import { listTenants, recordCheckin } from "@/lib/tenant-store";

const checkinSchema = z.object({
  tenantSlug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/).optional(),
  stationId: z.string().min(8).max(120),
  deviceId: z.string().min(16).max(120)
});

export async function POST(request: Request) {
  const parsed = checkinSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Ungültiger Check-in" }, { status: 400 });
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip")?.trim() || "local";
  const limited = rateLimit(`checkin:${ip}:${parsed.data.deviceId}`, 120, 60 * 60 * 1000);
  if (!limited.ok) return NextResponse.json({ error: "Zu viele Check-ins. Bitte später erneut versuchen." }, { status: 429 });
  const host = requestHeaders.get("host") ?? "localhost";
  const tenants = await listTenants();
  const tenant = parsed.data.tenantSlug
    ? tenants.find((candidate) => candidate.slug === parsed.data.tenantSlug)
    : resolveTenant(host, tenants);
  if (!tenant) return NextResponse.json({ error: "Mandant nicht gefunden" }, { status: 404 });
  if (!tenant.features.checkins && !tenant.features.rewards) return NextResponse.json({ error: "Check-ins sind deaktiviert" }, { status: 403 });
  const result = await recordCheckin(tenant.id, parsed.data.stationId, parsed.data.deviceId);
  return NextResponse.json(result);
}
