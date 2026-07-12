import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizePlatformAdmin } from "@/lib/platform-admin";
import { moduleCatalog, readPlatformSettings, writePlatformSettings } from "@/lib/platform-settings";

const featureSchema = z.record(z.enum(moduleCatalog.map((module) => module.id) as [string, ...string[]]), z.boolean());
const settingsSchema = z.object({
  availableFeatures: featureSchema,
  defaultFeatures: featureSchema,
  tenantAdminPermissions: z.object({
    integrations: z.boolean(),
    analytics: z.boolean(),
    storage: z.boolean(),
    backup: z.boolean()
  }),
  defaultIntegrations: z.object({
    mail: z.object({ provider: z.literal("global-smtp") }),
    captcha: z.object({ provider: z.enum(["turnstile", "hcaptcha", "recaptcha", "disabled"]), siteKey: z.string().max(500), requiredForSignup: z.boolean() }),
    storage: z.object({ provider: z.enum(["local", "s3", "external-url"]), maxUploadMb: z.number().min(1).max(100), allowedTypes: z.array(z.string().max(120)).min(1) }),
    database: z.object({ provider: z.literal("postgresql"), rlsRequired: z.boolean() }),
    backup: z.object({ enabled: z.boolean(), schedule: z.string().max(80), retentionDays: z.number().min(1).max(365) })
  }),
  defaultTracking: z.object({
    enabled: z.boolean(),
    provider: z.enum(["none", "matomo"]),
    measurementId: z.string().max(120),
    matomoUrl: z.string().max(500),
    matomoSiteId: z.string().max(80),
    anonymizeIp: z.boolean(),
    respectDoNotTrack: z.boolean()
  })
});

export async function GET() {
  const session = await authorizePlatformAdmin();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  return NextResponse.json({ settings: await readPlatformSettings(), modules: moduleCatalog });
}

export async function POST(request: Request) {
  const session = await authorizePlatformAdmin();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const parsed = settingsSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Bitte Plattformvorgaben prüfen.", details: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json({ settings: await writePlatformSettings(parsed.data) });
}
