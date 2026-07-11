import { NextResponse } from "next/server";
import { authorizePlatformAdmin } from "@/lib/platform-admin";
import { cleanupUnusedUploads } from "@/lib/upload-cleanup";

export async function GET() {
  return handleCleanup(true);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { dryRun?: boolean };
  return handleCleanup(body.dryRun !== false);
}

async function handleCleanup(dryRun: boolean) {
  const session = await authorizePlatformAdmin();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  return NextResponse.json(await cleanupUnusedUploads(dryRun));
}
