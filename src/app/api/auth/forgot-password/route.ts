import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { requestTenantPasswordReset } from "@/lib/tenant-store";

const schema = z.object({
  email: z.string().trim().email()
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: true });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limited = rateLimit(`forgot-password:${ip}:${parsed.data.email.toLowerCase()}`, 5, 60 * 60 * 1000);
  if (!limited.ok) return NextResponse.json({ ok: true });
  await requestTenantPasswordReset(parsed.data.email).catch((error) => {
    console.warn("Passwort-Reset-Mail konnte nicht gesendet werden.", error);
  });
  return NextResponse.json({ ok: true });
}
