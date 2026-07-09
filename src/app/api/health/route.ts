import { NextResponse } from "next/server";
import { listTenants } from "@/lib/tenant-store";

export async function GET() {
  const startedAt = Date.now();
  try {
    const tenants = await listTenants();
    return NextResponse.json({
      ok: true,
      app: "platzguide",
      revision: process.env.NEXT_PUBLIC_APP_REVISION ?? "dev",
      tenants: tenants.length,
      latencyMs: Date.now() - startedAt
    });
  } catch {
    return NextResponse.json({ ok: false, app: "platzguide" }, { status: 503 });
  }
}
