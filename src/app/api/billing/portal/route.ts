import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeTenantAdmin } from "@/lib/admin-session";
import { createCustomerPortalSession } from "@/lib/stripe-billing";

const portalSchema = z.object({
  tenantId: z.string().uuid()
});

export async function POST(request: Request) {
  const parsed = portalSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Mandant fehlt." }, { status: 400 });
  const authorization = await authorizeTenantAdmin(parsed.data.tenantId);
  if (!authorization) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  try {
    const session = await createCustomerPortalSession(authorization.tenant);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Stripe Portal konnte nicht geöffnet werden." }, { status: 500 });
  }
}
