import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizePlatformAdmin } from "@/lib/platform-admin";
import { readEnvLocal, updateEnvLocal } from "@/lib/env-file";

const captchaConfigSchema = z.object({
  provider: z.enum(["disabled", "turnstile", "hcaptcha", "recaptcha"]),
  siteKey: z.string().trim().max(1000),
  turnstileSecretKey: z.string().max(1000).optional(),
  hcaptchaSecretKey: z.string().max(1000).optional(),
  recaptchaSecretKey: z.string().max(1000).optional(),
  allowPublicSignup: z.boolean()
});

export async function GET() {
  const session = await authorizePlatformAdmin();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const env = await readEnvLocal();
  const provider = process.env.CAPTCHA_PROVIDER ?? env.CAPTCHA_PROVIDER ?? "disabled";
  return NextResponse.json({
    provider: ["turnstile", "hcaptcha", "recaptcha", "disabled"].includes(provider) ? provider : "disabled",
    siteKey: process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY ?? env.NEXT_PUBLIC_CAPTCHA_SITE_KEY ?? "",
    hasTurnstileSecretKey: Boolean(process.env.TURNSTILE_SECRET_KEY ?? env.TURNSTILE_SECRET_KEY),
    hasHcaptchaSecretKey: Boolean(process.env.HCAPTCHA_SECRET_KEY ?? env.HCAPTCHA_SECRET_KEY),
    hasRecaptchaSecretKey: Boolean(process.env.RECAPTCHA_SECRET_KEY ?? env.RECAPTCHA_SECRET_KEY),
    allowPublicSignup: (process.env.ALLOW_PUBLIC_SIGNUP ?? env.ALLOW_PUBLIC_SIGNUP ?? "false") === "true"
  });
}

export async function POST(request: Request) {
  const session = await authorizePlatformAdmin();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const parsed = captchaConfigSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Bitte Captcha-Daten prüfen.", details: parsed.error.flatten() }, { status: 400 });
  const values: Record<string, string> = {
    CAPTCHA_PROVIDER: parsed.data.provider,
    NEXT_PUBLIC_CAPTCHA_SITE_KEY: parsed.data.siteKey,
    ALLOW_PUBLIC_SIGNUP: String(parsed.data.allowPublicSignup)
  };
  if (parsed.data.turnstileSecretKey) values.TURNSTILE_SECRET_KEY = parsed.data.turnstileSecretKey;
  if (parsed.data.hcaptchaSecretKey) values.HCAPTCHA_SECRET_KEY = parsed.data.hcaptchaSecretKey;
  if (parsed.data.recaptchaSecretKey) values.RECAPTCHA_SECRET_KEY = parsed.data.recaptchaSecretKey;
  await updateEnvLocal(values);
  return NextResponse.json({ ok: true });
}
