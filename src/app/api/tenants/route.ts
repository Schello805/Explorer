import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { hash } from "bcryptjs";
import { z } from "zod";
import { verifyCaptcha } from "@/lib/captcha";
import { rateLimit } from "@/lib/rate-limit";
import { createTenantInstance } from "@/lib/tenant-store";

const tenantCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
  ownerEmail: z.string().trim().email(),
  ownerPassword: z.string().min(12).max(200),
  captchaToken: z.string().optional(),
  website: z.string().max(0).optional()
});

export async function POST(request: Request) {
  if (process.env.ALLOW_PUBLIC_SIGNUP !== "true") {
    return NextResponse.json({ error: "Self-Service ist aktuell deaktiviert." }, { status: 403 });
  }
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limited = rateLimit(`signup:${ip}`, 5, 60 * 60 * 1000);
  if (!limited.ok) return NextResponse.json({ error: "Zu viele Registrierungen. Bitte später erneut versuchen." }, { status: 429 });
  const parsed = tenantCreateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Bitte Name, Subdomain und E-Mail prüfen." }, { status: 400 });
  const captchaOk = await verifyCaptcha(parsed.data.captchaToken, ip);
  if (!captchaOk) return NextResponse.json({ error: "Captcha-Prüfung fehlgeschlagen." }, { status: 403 });
  try {
    const ownerPasswordHash = await hash(parsed.data.ownerPassword, 12);
    const tenant = await createTenantInstance({ ...parsed.data, ownerPasswordHash });
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
