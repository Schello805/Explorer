import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageTenant, isPlatformAdminSession, verifyAdminSession } from "@/lib/auth";
import { resolveAdminTenant } from "@/lib/admin-tenant-auth";
import { sendMail, tenantAdminUrl, tenantPublicUrl } from "@/lib/mail";
import { listTenants, saveTenantConfiguration } from "@/lib/tenant-store";
import type { Tenant } from "@/lib/types";

const uuid = z.string().uuid();
const categorySchema = z.object({ id: z.string().min(1), name: z.string().min(1).max(80), icon: z.string().max(80), color: z.string().max(40) });
const publicSnapshotSchema = z.object({
  id: z.string(),
  version: z.number(),
  createdAt: z.string(),
  createdBy: z.string(),
  tenant: z.unknown()
});
const tenantSchema = z.object({
  id: uuid,
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  hosts: z.array(z.string().trim().toLowerCase().min(1).max(255).regex(/^(?!https?:\/\/)([a-z0-9-]+\.)+[a-z]{2,}$/)).max(10),
  archivedAt: z.string().optional(),
  publishing: z.object({
    hasUnpublishedChanges: z.boolean(),
    publishedAt: z.string().optional(),
    publishedVersion: z.number().optional(),
    versions: z.array(publicSnapshotSchema)
  }).optional(),
  name: z.string().min(2).max(120),
  tagline: z.string().max(180),
  logoMark: z.string().min(1).max(4),
  theme: z.object({ primary: z.string().min(3), secondary: z.string().min(3), surface: z.string().min(3) }),
  map: z.object({
    center: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
    zoom: z.number().min(1).max(22),
    styleUrl: z.string().url(),
    configured: z.boolean().optional(),
    bounds: z.tuple([
      z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
      z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
    ]).optional(),
    sitePlan: z.object({
      imageUrl: z.string(),
      coordinates: z.tuple([
        z.tuple([z.number(), z.number()]),
        z.tuple([z.number(), z.number()]),
        z.tuple([z.number(), z.number()]),
        z.tuple([z.number(), z.number()])
      ]),
      attribution: z.string()
    }).optional()
  }),
  contact: z.object({ phone: z.string().max(80), email: z.string().email(), emergency: z.string().max(160) }),
  legal: z.object({ imprint: z.string().max(10000), privacy: z.string().max(20000), cookies: z.string().max(10000), terms: z.string().max(20000) }),
  tracking: z.object({
    enabled: z.boolean(),
    provider: z.enum(["none", "matomo"]),
    measurementId: z.string().max(120),
    matomoUrl: z.string().max(500),
    matomoSiteId: z.string().max(80),
    anonymizeIp: z.boolean(),
    respectDoNotTrack: z.boolean()
  }),
  email: z.object({ senderName: z.string().max(120), senderEmail: z.string().email(), replyTo: z.string().email() }),
  billing: z.object({
    plan: z.enum(["starter", "pro"]),
    status: z.enum(["trial", "active", "past_due", "blocked"]),
    publicEnabled: z.boolean(),
    monthlyPriceCents: z.number().min(0).max(100000),
    yearlyDiscountPercent: z.number().min(0).max(100),
    storageLimitMb: z.number().min(1).max(10240),
    supportResponseHours: z.number().min(1).max(168),
    setupServiceBooked: z.boolean().optional(),
    setupServicePriceCents: z.number().min(0).max(100000),
    customDomainEnabled: z.boolean(),
    stripeCustomerId: z.string().optional(),
    stripeSubscriptionId: z.string().optional(),
    stripePriceId: z.string().optional(),
    stripeCurrentPeriodEnd: z.string().optional(),
    stripeLatestInvoiceUrl: z.string().optional(),
    stripeCheckoutSessionId: z.string().optional(),
    stripePortalUrl: z.string().optional(),
    manualOverride: z.boolean().optional(),
    manualOverrideReason: z.string().optional()
  }),
  integrations: z.object({
    mail: z.object({
      provider: z.literal("global-smtp")
    }),
    captcha: z.object({ provider: z.enum(["turnstile", "hcaptcha", "recaptcha", "disabled"]), siteKey: z.string().max(500), requiredForSignup: z.boolean() }),
    storage: z.object({ provider: z.enum(["local", "s3", "external-url"]), maxUploadMb: z.number().min(1).max(100), allowedTypes: z.array(z.string().max(120)).min(1) }),
    database: z.object({ provider: z.literal("postgresql"), rlsRequired: z.boolean() }),
    backup: z.object({ enabled: z.boolean(), schedule: z.string().max(80), retentionDays: z.number().min(1).max(365) })
  }),
  features: z.record(z.string(), z.boolean()),
  categories: z.array(categorySchema).min(1),
  stations: z.array(z.unknown()),
  media: z.array(z.unknown()),
  events: z.array(z.unknown()),
  tours: z.array(z.unknown()),
  rewards: z.array(z.unknown()),
  pushMessages: z.array(z.unknown()).optional(),
  pushSubscriptions: z.array(z.unknown()).optional(),
  checkins: z.array(z.unknown()).optional(),
  occupancyStatuses: z.array(z.unknown()).optional(),
  guestGuide: z.array(z.unknown()),
  feedback: z.array(z.unknown()),
  auditLog: z.array(z.unknown()),
  users: z.array(z.unknown()),
  privacyRequests: z.array(z.unknown())
});

async function authorize() {
  const cookieStore = await cookies();
  const session = await verifyAdminSession(
    cookieStore.get("platzguide_session")?.value ?? cookieStore.get("explorer_session")?.value
  );
  if (!session) return null;
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost";
  const tenants = await listTenants();
  const tenant = resolveAdminTenant(host, tenants, session);
  if (!tenant) return null;
  return canManageTenant(session, tenant.id) ? { session, tenant, tenants } : null;
}

export async function POST(request: Request) {
  const authorization = await authorize();
  if (!authorization) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const parsed = tenantSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Mandantendaten", details: parsed.error.flatten() }, { status: 400 });
  const targetTenant = authorization.tenants.find((tenant) => tenant.id === parsed.data.id);
  if (!targetTenant || !canManageTenant(authorization.session, targetTenant.id)) {
    return NextResponse.json({ error: "Mandantenzugriff verweigert" }, { status: 403 });
  }
  const hostCollision = parsed.data.hosts.find((host) => authorization.tenants.some((tenant) => tenant.id !== targetTenant.id && tenant.hosts.includes(host)));
  if (hostCollision) return NextResponse.json({ error: `Domain ist bereits vergeben: ${hostCollision}` }, { status: 409 });
  if (parsed.data.hosts.length > 0 && !parsed.data.billing.customDomainEnabled && !isPlatformAdminSession(authorization.session)) {
    return NextResponse.json({ error: "Eigene Domains sind nur im Pro-Paket möglich." }, { status: 403 });
  }
  const platformAdmin = isPlatformAdminSession(authorization.session);
  const safeTenant = platformAdmin
    ? { ...parsed.data, email: targetTenant.email, integrations: { ...parsed.data.integrations, mail: targetTenant.integrations.mail } }
    : restrictTenantAdminWrite(parsed.data as typeof targetTenant, targetTenant);
  const previousBilling = targetTenant.billing;
  const tenant = await saveTenantConfiguration(targetTenant.id, safeTenant as typeof targetTenant, authorization.session.email);
  if (platformAdmin && JSON.stringify(previousBilling) !== JSON.stringify(tenant.billing)) {
    await sendBillingUpdateMails(tenant, authorization.session.email).catch((error) => {
      console.warn("Abo-Mail konnte nicht gesendet werden.", error);
    });
  }
  return NextResponse.json(tenant);
}

type TenantPayload = z.infer<typeof tenantSchema>;

function restrictTenantAdminWrite(nextTenant: TenantPayload, currentTenant: TenantPayload) {
  return {
    ...nextTenant,
    id: currentTenant.id,
    slug: currentTenant.slug,
    hosts: currentTenant.hosts,
    archivedAt: currentTenant.archivedAt,
    email: currentTenant.email,
    billing: currentTenant.billing,
    features: currentTenant.features,
    integrations: {
      ...currentTenant.integrations,
      mail: currentTenant.integrations.mail
    },
    users: currentTenant.users,
    auditLog: currentTenant.auditLog,
    privacyRequests: currentTenant.privacyRequests
  };
}

async function sendBillingUpdateMails(tenant: Tenant, actorEmail: string) {
  if (!process.env.SMTP_HOST || !process.env.MAIL_FROM) return;
  const recipients = [...new Set(tenant.users
    .filter((user) => user.role === "tenant-owner" || user.role === "tenant-editor")
    .map((user) => user.email))];
  if (recipients.length === 0) return;
  const publicState = tenant.billing.publicEnabled && tenant.billing.status === "active"
    ? "Besucher-App ist öffentlich sichtbar"
    : "Besucher-App ist noch nicht öffentlich sichtbar";
  const subject = tenant.billing.publicEnabled && tenant.billing.status === "active"
    ? `Platzguide freigeschaltet · ${tenant.name}`
    : `Abo aktualisiert · ${tenant.name}`;
  await Promise.all(recipients.map((email) => sendMail({
    to: email,
    tenantSlug: tenant.slug,
    subject,
    eyebrow: "Abo & Veröffentlichung",
    title: publicState,
    intro: `Die Abo- und Veröffentlichungsdaten für ${tenant.name} wurden aktualisiert.\n\nDu kannst deinen Platzguide weiterhin im Adminbereich pflegen.`,
    text: `Abo aktualisiert für ${tenant.name}\n\nStatus: ${billingStatusLabel[tenant.billing.status]}\nPaket: ${tenant.billing.plan}\nBesucher-App: ${publicState}\n\nAdminbereich: ${tenantAdminUrl(tenant.slug)}\nBesucheransicht: ${tenantPublicUrl(tenant.slug)}`,
    actionLabel: "Adminbereich öffnen",
    actionUrl: tenantAdminUrl(tenant.slug),
    rows: [
      { label: "Campingplatz", value: tenant.name },
      { label: "Paket", value: tenant.billing.plan === "pro" ? "Pro" : "Starter" },
      { label: "Status", value: billingStatusLabel[tenant.billing.status] },
      { label: "Besucher-App", value: publicState },
      { label: "Ausgelöst von", value: actorEmail },
      { label: "Öffentlicher Link", value: tenantPublicUrl(tenant.slug) }
    ]
  })));
}

const billingStatusLabel: Record<Tenant["billing"]["status"], string> = {
  trial: "Testphase",
  active: "Aktiv",
  past_due: "Zahlung offen",
  blocked: "Gesperrt"
};
