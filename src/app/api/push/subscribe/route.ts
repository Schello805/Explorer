import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveTenant } from "@/lib/tenant-resolver";
import { listTenants, savePushSubscription } from "@/lib/tenant-store";
import { publicVapidKey } from "@/lib/web-push";

const subscriptionSchema = z.object({
  tenantSlug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/).optional(),
  subscription: z.object({
    endpoint: z.string().url(),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({
      p256dh: z.string().min(10),
      auth: z.string().min(10)
    })
  })
});

export async function GET() {
  return NextResponse.json({ publicKey: publicVapidKey(), configured: Boolean(publicVapidKey()) });
}

export async function POST(request: Request) {
  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Ungültiges Push-Abo" }, { status: 400 });
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost";
  const tenants = await listTenants();
  const tenant = parsed.data.tenantSlug
    ? tenants.find((candidate) => candidate.slug === parsed.data.tenantSlug)
    : resolveTenant(host, tenants);
  if (!tenant) return NextResponse.json({ error: "Mandant nicht gefunden" }, { status: 404 });
  if (!tenant.features.push) return NextResponse.json({ error: "Mitteilungen sind deaktiviert" }, { status: 403 });
  await savePushSubscription(tenant.id, {
    subscription: parsed.data.subscription,
    userAgent: requestHeaders.get("user-agent") ?? undefined
  });
  return NextResponse.json({ ok: true });
}
