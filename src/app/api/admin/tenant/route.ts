import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_EMAIL, verifyAdminSession } from "@/lib/auth";
import { resolveTenant } from "@/lib/tenant-resolver";
import { listTenants, saveTenantConfiguration } from "@/lib/tenant-store";

const uuid = z.string().uuid();
const categorySchema = z.object({ id: z.string().min(1), name: z.string().min(1).max(80), icon: z.string().max(80), color: z.string().max(40) });
const tenantSchema = z.object({
  id: uuid,
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  hosts: z.array(z.string().min(1).max(255)).min(1),
  name: z.string().min(2).max(120),
  tagline: z.string().max(180),
  logoMark: z.string().min(1).max(4),
  theme: z.object({ primary: z.string().min(3), secondary: z.string().min(3), surface: z.string().min(3) }),
  map: z.object({
    center: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
    zoom: z.number().min(1).max(22),
    styleUrl: z.string().url(),
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
  legal: z.object({ imprint: z.string().max(10000), privacy: z.string().max(20000), cookies: z.string().max(10000) }),
  tracking: z.object({ enabled: z.boolean(), provider: z.string().max(80), measurementId: z.string().max(120) }),
  email: z.object({ senderName: z.string().max(120), senderEmail: z.string().email(), replyTo: z.string().email() }),
  features: z.record(z.string(), z.boolean()),
  categories: z.array(categorySchema).min(1),
  stations: z.array(z.unknown()),
  media: z.array(z.unknown()),
  events: z.array(z.unknown()),
  tours: z.array(z.unknown()),
  rewards: z.array(z.unknown()),
  guestGuide: z.array(z.unknown()),
  feedback: z.array(z.unknown()),
  auditLog: z.array(z.unknown())
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
  const normalized = host.split(":")[0];
  return tenants.find((tenant) => tenant.hosts.includes(normalized))
    ?? tenants.find((tenant) => tenant.slug === normalized.split(".")[0])
    ?? resolveTenant(host, tenants);
}

export async function POST(request: Request) {
  const currentTenant = await authorize();
  if (!currentTenant) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const parsed = tenantSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Mandantendaten", details: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.id !== currentTenant.id) return NextResponse.json({ error: "Mandantenzugriff verweigert" }, { status: 403 });
  const tenant = await saveTenantConfiguration(currentTenant.id, parsed.data as typeof currentTenant, ADMIN_EMAIL);
  return NextResponse.json(tenant);
}
