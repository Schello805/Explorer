import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_EMAIL, canManageTenant, verifyAdminSession } from "@/lib/auth";
import { resolveAdminTenant } from "@/lib/admin-tenant-auth";
import { listTenants, saveTenantConfiguration } from "@/lib/tenant-store";

const uuid = z.string().uuid();
const categorySchema = z.object({ id: z.string().min(1), name: z.string().min(1).max(80), icon: z.string().max(80), color: z.string().max(40) });
const tenantSchema = z.object({
  id: uuid,
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  hosts: z.array(z.string().min(1).max(255)),
  archivedAt: z.string().optional(),
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
    aerialTiles: z.array(z.string()).optional(),
    aerialAttribution: z.string().optional(),
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
    customDomainEnabled: z.boolean()
  }),
  integrations: z.object({
    mail: z.object({
      provider: z.literal("global-smtp")
    }),
    captcha: z.object({ provider: z.enum(["turnstile", "hcaptcha", "disabled"]), siteKey: z.string().max(500), requiredForSignup: z.boolean() }),
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
  const platformAdmin = authorization.session.role === "platform-admin" && authorization.session.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const safeTenant = platformAdmin
    ? { ...parsed.data, email: targetTenant.email, integrations: { ...parsed.data.integrations, mail: targetTenant.integrations.mail } }
    : restrictTenantAdminWrite(parsed.data as typeof targetTenant, targetTenant);
  const tenant = await saveTenantConfiguration(targetTenant.id, safeTenant as typeof targetTenant, authorization.session.email);
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
