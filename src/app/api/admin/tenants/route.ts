import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { authorizePlatformAdmin } from "@/lib/platform-admin";
import { createTenantInstance } from "@/lib/tenant-store";

const tenantCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
  ownerEmail: z.string().trim().email(),
  ownerPassword: z.string().min(12).max(200)
});

export async function POST(request: Request) {
  const session = await authorizePlatformAdmin();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const parsed = tenantCreateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Bitte Name, Link-Kürzel, E-Mail und Passwort prüfen." }, { status: 400 });

  try {
    const ownerPasswordHash = await hash(parsed.data.ownerPassword, 12);
    const tenant = await createTenantInstance({
      ...parsed.data,
      ownerPasswordHash,
      actorEmail: session.email,
      emailVerified: true,
      sendVerificationEmail: false
    });
    return NextResponse.json({ tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug } });
  } catch (error) {
    const message = error instanceof Error && error.message === "Slug already exists"
      ? "Dieses Link-Kürzel ist schon vergeben."
      : "Der Campingplatz konnte nicht angelegt werden.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
