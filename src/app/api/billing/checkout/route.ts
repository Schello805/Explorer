import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeTenantAdmin } from "@/lib/admin-session";
import { createSubscriptionCheckout } from "@/lib/stripe-billing";

const checkoutSchema = z.object({
  tenantId: z.string().uuid(),
  plan: z.enum(["starter", "pro"]),
  interval: z.enum(["monthly", "yearly"])
});

export async function POST(request: Request) {
  const parsed = checkoutSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Bitte Paket und Zahlungsintervall prüfen." }, { status: 400 });
  const authorization = await authorizeTenantAdmin(parsed.data.tenantId);
  if (!authorization) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  try {
    const session = await createSubscriptionCheckout(authorization.tenant, parsed.data.plan, parsed.data.interval);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Stripe Checkout konnte nicht erstellt werden." }, { status: 500 });
  }
}
