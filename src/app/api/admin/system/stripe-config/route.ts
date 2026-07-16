import { NextResponse } from "next/server";
import { z } from "zod";
import { readEnvLocal, updateEnvLocal } from "@/lib/env-file";
import { appUrl } from "@/lib/mail";
import { authorizePlatformAdmin } from "@/lib/platform-admin";

const stripeConfigSchema = z.object({
  enabled: z.boolean(),
  publishableKey: z.string().trim().max(500).optional().or(z.literal("")),
  secretKey: z.string().trim().max(500).optional().or(z.literal("")),
  webhookSecret: z.string().trim().max(500).optional().or(z.literal("")),
  starterMonthlyPriceId: z.string().trim().max(200).optional().or(z.literal("")),
  starterYearlyPriceId: z.string().trim().max(200).optional().or(z.literal("")),
  proMonthlyPriceId: z.string().trim().max(200).optional().or(z.literal("")),
  proYearlyPriceId: z.string().trim().max(200).optional().or(z.literal("")),
  setupServicePriceId: z.string().trim().max(200).optional().or(z.literal("")),
  taxMode: z.enum(["small_business_de", "regular_de"])
});

export async function GET() {
  const session = await authorizePlatformAdmin();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const env = await readEnvLocal();
  const value = (key: string) => process.env[key] ?? env[key] ?? "";
  return NextResponse.json({
    enabled: value("STRIPE_ENABLED") === "true",
    publishableKey: value("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
    secretKey: "",
    webhookSecret: "",
    hasSecretKey: Boolean(value("STRIPE_SECRET_KEY")),
    hasWebhookSecret: Boolean(value("STRIPE_WEBHOOK_SECRET")),
    starterMonthlyPriceId: value("STRIPE_STARTER_MONTHLY_PRICE_ID"),
    starterYearlyPriceId: value("STRIPE_STARTER_YEARLY_PRICE_ID"),
    proMonthlyPriceId: value("STRIPE_PRO_MONTHLY_PRICE_ID"),
    proYearlyPriceId: value("STRIPE_PRO_YEARLY_PRICE_ID"),
    setupServicePriceId: value("STRIPE_SETUP_SERVICE_PRICE_ID"),
    taxMode: value("STRIPE_TAX_MODE") === "regular_de" ? "regular_de" : "small_business_de",
    webhookUrl: appUrl("/api/stripe/webhook"),
    configured: Boolean(value("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY") && value("STRIPE_SECRET_KEY") && value("STRIPE_WEBHOOK_SECRET"))
  });
}

export async function POST(request: Request) {
  const session = await authorizePlatformAdmin();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const parsed = stripeConfigSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Bitte Stripe-Daten prüfen.", details: parsed.error.flatten() }, { status: 400 });
  const values: Record<string, string> = {
    STRIPE_ENABLED: String(parsed.data.enabled),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: parsed.data.publishableKey ?? "",
    STRIPE_STARTER_MONTHLY_PRICE_ID: parsed.data.starterMonthlyPriceId ?? "",
    STRIPE_STARTER_YEARLY_PRICE_ID: parsed.data.starterYearlyPriceId ?? "",
    STRIPE_PRO_MONTHLY_PRICE_ID: parsed.data.proMonthlyPriceId ?? "",
    STRIPE_PRO_YEARLY_PRICE_ID: parsed.data.proYearlyPriceId ?? "",
    STRIPE_SETUP_SERVICE_PRICE_ID: parsed.data.setupServicePriceId ?? "",
    STRIPE_TAX_MODE: parsed.data.taxMode
  };
  if (parsed.data.secretKey) values.STRIPE_SECRET_KEY = parsed.data.secretKey;
  if (parsed.data.webhookSecret) values.STRIPE_WEBHOOK_SECRET = parsed.data.webhookSecret;
  await updateEnvLocal(values);
  return NextResponse.json({ ok: true });
}
