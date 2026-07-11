import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { resetTenantUserPassword } from "@/lib/tenant-store";

const schema = z.object({
  token: z.string().uuid(),
  password: z.string().min(12).max(200)
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Link oder Passwort ist ungültig." }, { status: 400 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limited = rateLimit(`reset-password:${ip}`, 10, 60 * 60 * 1000);
  if (!limited.ok) return NextResponse.json({ error: "Zu viele Versuche. Bitte später erneut versuchen." }, { status: 429 });
  try {
    const passwordHash = await hash(parsed.data.password, 12);
    await resetTenantUserPassword(parsed.data.token, passwordHash);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Der Link ist ungültig oder abgelaufen." }, { status: 400 });
  }
}
