import { NextResponse } from "next/server";
import { z } from "zod";
import { createTenantInstance } from "@/lib/tenant-store";

const tenantCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
  ownerEmail: z.string().trim().email()
});

export async function POST(request: Request) {
  const parsed = tenantCreateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Bitte Name, Subdomain und E-Mail prüfen." }, { status: 400 });
  try {
    const tenant = await createTenantInstance(parsed.data);
    return NextResponse.json({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      localUrl: `/?camp=${tenant.slug}`,
      subdomain: `${tenant.slug}.app-domain.de`
    });
  } catch (error) {
    const message = error instanceof Error && error.message === "Slug already exists"
      ? "Diese Subdomain ist schon vergeben."
      : "Die Instanz konnte nicht erstellt werden.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
