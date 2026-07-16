import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeTenantAdmin } from "@/lib/admin-session";
import { markPushMessageSent } from "@/lib/tenant-store";
import { tenantPublicUrl } from "@/lib/mail";
import { sendWebPush, webPushConfigured } from "@/lib/web-push";

const sendSchema = z.object({
  tenantId: z.string().uuid(),
  messageId: z.string().min(8)
});

export async function POST(request: Request) {
  const parsed = sendSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Push-Anfrage." }, { status: 400 });
  const authorization = await authorizeTenantAdmin(parsed.data.tenantId);
  if (!authorization) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const message = authorization.tenant.pushMessages.find((item) => item.id === parsed.data.messageId);
  if (!message) return NextResponse.json({ error: "Mitteilung nicht gefunden." }, { status: 404 });
  if (!authorization.tenant.features.push) return NextResponse.json({ error: "Mitteilungen sind deaktiviert." }, { status: 403 });

  let sentCount = 0;
  let failedCount = 0;
  for (const subscription of authorization.tenant.pushSubscriptions) {
    try {
      const result = await sendWebPush(subscription, {
        title: message.title,
        body: message.body,
        url: tenantPublicUrl(authorization.tenant.slug)
      });
      if (result.ok) sentCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  await markPushMessageSent(authorization.tenant.id, message.id, sentCount, authorization.session.email);
  return NextResponse.json({
    ok: true,
    configured: webPushConfigured(),
    sentCount,
    failedCount,
    subscriptions: authorization.tenant.pushSubscriptions.length
  });
}
