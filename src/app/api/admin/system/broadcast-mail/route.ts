import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizePlatformAdmin } from "@/lib/platform-admin";
import { sendMail, tenantAdminUrl } from "@/lib/mail";
import { listTenants } from "@/lib/tenant-store";

const broadcastSchema = z.object({
  subject: z.string().min(3).max(180),
  body: z.string().min(5).max(10000),
  groups: z.array(z.enum(["trial", "starter", "pro", "active", "past_due", "blocked"])).min(1),
  testOnly: z.boolean()
});

export async function POST(request: Request) {
  const session = await authorizePlatformAdmin();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const parsed = broadcastSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Bitte Betreff, Text und Empfängergruppen prüfen." }, { status: 400 });
  const tenants = await listTenants();
  const selectedTenants = tenants.filter((tenant) => {
    const groups = parsed.data.groups;
    return groups.includes(tenant.billing.status)
      || groups.includes(tenant.billing.plan)
      || groups.includes("trial") && tenant.billing.status === "trial";
  });
  const recipients = parsed.data.testOnly
    ? [{ email: session.email, tenantName: "Testmail", tenantSlug: "" }]
    : selectedTenants.flatMap((tenant) => tenant.users
      .filter((user) => user.role === "tenant-owner" || user.role === "tenant-editor")
      .map((user) => ({ email: user.email, tenantName: tenant.name, tenantSlug: tenant.slug })));
  const uniqueRecipients = [...new Map(recipients.map((recipient) => [`${recipient.email}-${recipient.tenantSlug}`, recipient])).values()];
  await Promise.all(uniqueRecipients.map((recipient) => sendMail({
    to: recipient.email,
    subject: parsed.data.testOnly ? `[Test] ${parsed.data.subject}` : parsed.data.subject,
    eyebrow: "Platzguide",
    title: parsed.data.subject,
    intro: parsed.data.body,
    text: `${parsed.data.subject}\n\n${parsed.data.body}\n\n${recipient.tenantSlug ? tenantAdminUrl(recipient.tenantSlug) : ""}`,
    actionLabel: recipient.tenantSlug ? "Adminbereich öffnen" : undefined,
    actionUrl: recipient.tenantSlug ? tenantAdminUrl(recipient.tenantSlug) : undefined,
    rows: [
      { label: "Campingplatz", value: recipient.tenantName },
      { label: "Mailtyp", value: parsed.data.testOnly ? "Testmail" : "Superadmin-Rundmail" }
    ],
    footerNote: "Marketing-Mails werden künftig mit Abmeldeoption versendet. System- und Vertragsmails bleiben davon unberührt."
  })));
  return NextResponse.json({ ok: true, recipients: uniqueRecipients.length, previewTenants: selectedTenants.length });
}
