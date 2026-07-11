import { NextResponse } from "next/server";
import { cleanupUnusedUploads } from "@/lib/upload-cleanup";

export async function POST(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret") ?? request.headers.get("x-maintenance-secret");
  if (!process.env.MAINTENANCE_SECRET || secret !== process.env.MAINTENANCE_SECRET) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({})) as { dryRun?: boolean };
  return NextResponse.json(await cleanupUnusedUploads(body.dryRun !== false));
}
