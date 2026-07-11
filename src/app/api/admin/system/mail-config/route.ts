import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizePlatformAdmin } from "@/lib/platform-admin";
import { readEnvLocal, updateEnvLocal } from "@/lib/env-file";
import { appUrl, sendMail } from "@/lib/mail";

const mailConfigSchema = z.object({
  smtpHost: z.string().trim().max(300),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  smtpSecure: z.boolean(),
  smtpUser: z.string().trim().max(300),
  smtpPassword: z.string().max(500).optional(),
  mailFrom: z.string().trim().email(),
  mailFromName: z.string().trim().min(1).max(120),
  mailLogoUrl: z.string().trim().url().optional().or(z.literal(""))
});

export async function GET() {
  const session = await authorizePlatformAdmin();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const env = await readEnvLocal();
  return NextResponse.json({
    smtpHost: process.env.SMTP_HOST ?? env.SMTP_HOST ?? "",
    smtpPort: Number(process.env.SMTP_PORT ?? env.SMTP_PORT ?? 587),
    smtpSecure: (process.env.SMTP_SECURE ?? env.SMTP_SECURE ?? "false") === "true",
    smtpUser: process.env.SMTP_USER ?? env.SMTP_USER ?? "",
    hasSmtpPassword: Boolean(process.env.SMTP_PASSWORD ?? env.SMTP_PASSWORD),
    mailFrom: process.env.MAIL_FROM ?? env.MAIL_FROM ?? "noreply@platzguide.de",
    mailFromName: process.env.MAIL_FROM_NAME ?? env.MAIL_FROM_NAME ?? "Platzguide",
    mailLogoUrl: process.env.MAIL_LOGO_URL ?? env.MAIL_LOGO_URL ?? appUrl("/icons/platzguide-logo.png"),
    configured: Boolean((process.env.SMTP_HOST ?? env.SMTP_HOST) && (process.env.MAIL_FROM ?? env.MAIL_FROM))
  });
}

export async function POST(request: Request) {
  const session = await authorizePlatformAdmin();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const parsed = mailConfigSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Bitte SMTP-Daten prüfen.", details: parsed.error.flatten() }, { status: 400 });
  const values: Record<string, string> = {
    SMTP_HOST: parsed.data.smtpHost,
    SMTP_PORT: String(parsed.data.smtpPort),
    SMTP_SECURE: String(parsed.data.smtpSecure),
    SMTP_USER: parsed.data.smtpUser,
    MAIL_FROM: parsed.data.mailFrom,
    MAIL_FROM_NAME: parsed.data.mailFromName,
    MAIL_LOGO_URL: parsed.data.mailLogoUrl || appUrl("/icons/platzguide-logo.png")
  };
  if (parsed.data.smtpPassword) values.SMTP_PASSWORD = parsed.data.smtpPassword;
  await updateEnvLocal(values);
  return NextResponse.json({ ok: true });
}

export async function PUT() {
  const session = await authorizePlatformAdmin();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  await sendMail({
    to: session.email,
    subject: "Platzguide SMTP-Test",
    eyebrow: "Superadmin",
    title: "SMTP ist korrekt konfiguriert.",
    intro: "Diese Testmail wurde über die zentrale Plattform-Konfiguration versendet.",
    text: `SMTP-Test erfolgreich.\n\nAdminbereich: ${appUrl("/admin")}`,
    actionLabel: "Adminbereich öffnen",
    actionUrl: appUrl("/admin"),
    rows: [
      { label: "Empfänger", value: session.email },
      { label: "Absender", value: `${process.env.MAIL_FROM_NAME ?? "Platzguide"} <${process.env.MAIL_FROM ?? ""}>` }
    ]
  });
  return NextResponse.json({ ok: true });
}
