import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageTenant, verifyAdminSession } from "@/lib/auth";
import { resolveAdminTenant } from "@/lib/admin-tenant-auth";
import { sendMail, tenantAdminUrl, tenantPublicUrl } from "@/lib/mail";
import { listTenants } from "@/lib/tenant-store";

const testMailSchema = z.object({
  tenantId: z.string().uuid().optional()
});

async function authorize(requestedTenantId?: string) {
  const cookieStore = await cookies();
  const session = await verifyAdminSession(
    cookieStore.get("platzguide_session")?.value ?? cookieStore.get("explorer_session")?.value
  );
  if (!session) return null;
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost";
  const tenants = await listTenants();
  const tenant = requestedTenantId
    ? tenants.find((candidate) => candidate.id === requestedTenantId)
    : resolveAdminTenant(host, tenants, session);
  if (!tenant || !canManageTenant(session, tenant.id)) return null;
  return { session, tenant };
}

export async function POST(request: Request) {
  const parsed = testMailSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  const authorization = await authorize(parsed.data.tenantId);
  if (!authorization) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const recipients = authorization.tenant.users
    .filter((user) => user.role === "tenant-owner" || user.role === "tenant-editor")
    .map((user) => user.email.toLowerCase());
  const uniqueRecipients = [...new Set(recipients)];
  if (uniqueRecipients.length === 0) {
    return NextResponse.json({ error: "Für diesen Mandanten ist kein Admin-Empfänger hinterlegt." }, { status: 400 });
  }

  await sendMail({
    to: uniqueRecipients.join(","),
    tenantSlug: authorization.tenant.slug,
    subject: `Platzguide Testmail · ${authorization.tenant.name}`,
    eyebrow: "SMTP-Test",
    title: "Dein Mailversand funktioniert.",
    intro: `Diese Testmail wurde erfolgreich über die globalen SMTP-Einstellungen von Platzguide versendet.\n\nE-Mails gehen ausschließlich an Admins des jeweiligen Mandanten. Gäste erhalten keine Systemmails.`,
    text: `Diese Testmail wurde erfolgreich für ${authorization.tenant.name} versendet.\n\nAdminbereich: ${tenantAdminUrl(authorization.tenant.slug)}\nBesucheransicht: ${tenantPublicUrl(authorization.tenant.slug)}\n\nAusgelöst von: ${authorization.session.email}\nZeitpunkt: ${new Date().toISOString()}`,
    actionLabel: "Adminbereich öffnen",
    actionUrl: tenantAdminUrl(authorization.tenant.slug),
    rows: [
      { label: "Campingplatz", value: authorization.tenant.name },
      { label: "Besucheransicht", value: tenantPublicUrl(authorization.tenant.slug) },
      { label: "Ausgelöst von", value: authorization.session.email },
      { label: "Zeitpunkt", value: new Date().toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }) }
    ],
    footerNote: "Diese Testmail bestätigt nur die Plattform-SMTP-Konfiguration."
  });

  return NextResponse.json({ ok: true, recipients: uniqueRecipients.length });
}
