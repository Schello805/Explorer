import { NextResponse } from "next/server";
import { authorizePlatformAdmin } from "@/lib/platform-admin";
import { listTenants } from "@/lib/tenant-store";

export async function GET() {
  const session = await authorizePlatformAdmin();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const startedAt = Date.now();
  try {
    const tenants = await listTenants();
    return NextResponse.json({
      ok: true,
      app: "platzguide",
      revision: process.env.NEXT_PUBLIC_APP_REVISION ?? "dev",
      tenants: tenants.length,
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      app: "platzguide",
      revision: process.env.NEXT_PUBLIC_APP_REVISION ?? "dev",
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString()
    }, { status: 503 });
  }
}
