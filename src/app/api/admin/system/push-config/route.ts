import { NextResponse } from "next/server";
import { z } from "zod";
import { updateEnvLocal, readEnvLocal } from "@/lib/env-file";
import { authorizePlatformAdmin } from "@/lib/platform-admin";

const pushConfigSchema = z.object({
  publicKey: z.string().trim().max(1000),
  privateKey: z.string().trim().max(1000).optional()
});

export async function GET() {
  const session = await authorizePlatformAdmin();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const env = await readEnvLocal();
  return NextResponse.json({
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
    hasPrivateKey: Boolean(process.env.VAPID_PRIVATE_KEY ?? env.VAPID_PRIVATE_KEY),
    configured: Boolean((process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) && (process.env.VAPID_PRIVATE_KEY ?? env.VAPID_PRIVATE_KEY))
  });
}

export async function POST(request: Request) {
  const session = await authorizePlatformAdmin();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const parsed = pushConfigSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Bitte Web-Push-Daten prüfen.", details: parsed.error.flatten() }, { status: 400 });
  const values: Record<string, string> = {
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: parsed.data.publicKey
  };
  if (parsed.data.privateKey) values.VAPID_PRIVATE_KEY = parsed.data.privateKey;
  await updateEnvLocal(values);
  return NextResponse.json({ ok: true });
}
