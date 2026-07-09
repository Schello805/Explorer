import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-host", request.headers.get("host") ?? "localhost");

  if (request.nextUrl.pathname.startsWith("/admin") &&
      request.nextUrl.pathname !== "/admin/login") {
    const session = await verifyAdminSession(request.cookies.get("explorer_session")?.value);
    if (!session) return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons).*)"]
};
