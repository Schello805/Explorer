import { NextResponse } from "next/server";
import { verifyTenantUserEmail } from "@/lib/tenant-store";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/admin/login?verified=missing", request.url));
  try {
    await verifyTenantUserEmail(token);
    return NextResponse.redirect(new URL("/admin/login?verified=1", request.url));
  } catch {
    return NextResponse.redirect(new URL("/admin/login?verified=failed", request.url));
  }
}
