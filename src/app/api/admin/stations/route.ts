import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_EMAIL, verifyAdminSession } from "@/lib/auth";
import { resolveTenant } from "@/lib/tenant-resolver";
import { deleteStation, listTenants, saveStation } from "@/lib/tenant-store";

const stationSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().uuid(),
  categoryId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  shortDescription: z.string().max(240),
  description: z.string().max(10000),
  openingHours: z.string().max(200),
  status: z.enum(["open", "closed", "limited", "maintenance"]),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  position: z.object({ x: z.number(), y: z.number() }),
  image: z.string().max(2000),
  featured: z.boolean().optional()
});

async function authorize() {
  const cookieStore = await cookies();
  const session = await verifyAdminSession(cookieStore.get("explorer_session")?.value);
  if (!session) return null;
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost";
  const tenants = await listTenants();
  const normalized = host.split(":")[0];
  return tenants.find((tenant) => tenant.hosts.includes(normalized))
    ?? tenants.find((tenant) => tenant.slug === normalized.split(".")[0])
    ?? resolveTenant(host);
}

export async function POST(request: Request) {
  const tenant = await authorize();
  if (!tenant) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const parsed = stationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Stationsdaten", details: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.tenantId !== tenant.id) return NextResponse.json({ error: "Mandantenzugriff verweigert" }, { status: 403 });
  return NextResponse.json(await saveStation(tenant.id, parsed.data, ADMIN_EMAIL));
}

export async function DELETE(request: Request) {
  const tenant = await authorize();
  if (!tenant) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Stations-ID fehlt" }, { status: 400 });
  await deleteStation(tenant.id, id, ADMIN_EMAIL);
  return NextResponse.json({ ok: true });
}
