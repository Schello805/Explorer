import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizePlatformAdmin } from "@/lib/platform-admin";
import { readPlatformLegal, writePlatformLegal } from "@/lib/platform-legal";

const legalSchema = z.object({
  imprint: z.string().max(20000),
  privacy: z.string().max(40000),
  cookies: z.string().max(20000),
  terms: z.string().max(40000)
});

export async function GET() {
  const session = await authorizePlatformAdmin();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  return NextResponse.json(await readPlatformLegal());
}

export async function POST(request: Request) {
  const session = await authorizePlatformAdmin();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const parsed = legalSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Bitte Rechtstexte prüfen.", details: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json(await writePlatformLegal(parsed.data));
}
