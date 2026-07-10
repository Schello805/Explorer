import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth";

const staleAssetRecoveryScript = `
(function () {
  var key = "platzguide-stale-asset-recovery";
  try {
    if (sessionStorage.getItem(key) === "done") return;
    sessionStorage.setItem(key, "done");
  } catch (error) {}

  var clearCaches = "caches" in window
    ? caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (name) { return caches.delete(name); }));
      })
    : Promise.resolve();

  var unregisterWorkers = "serviceWorker" in navigator
    ? navigator.serviceWorker.getRegistrations().then(function (registrations) {
        return Promise.all(registrations.map(function (registration) { return registration.unregister(); }));
      })
    : Promise.resolve();

  Promise.allSettled([clearCaches, unregisterWorkers]).then(function () {
    window.location.reload();
  });
})();
`;

const knownStaleChunks = new Set([
  "/_next/static/chunks/08dj8jc9ilu6-.js",
  "/_next/static/chunks/11c89nsesuvoe.js"
]);

const knownStaleStyles = new Set([
  "/_next/static/chunks/1yna4ah8qm5sj.css"
]);

export async function middleware(request: NextRequest) {
  if (knownStaleChunks.has(request.nextUrl.pathname)) {
    return new NextResponse(staleAssetRecoveryScript, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Content-Type": "application/javascript; charset=utf-8",
        "X-Platzguide-Recovery": "stale-asset"
      }
    });
  }

  if (knownStaleStyles.has(request.nextUrl.pathname)) {
    return new NextResponse("/* Platzguide stale stylesheet ignored. */", {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Content-Type": "text/css; charset=utf-8",
        "X-Platzguide-Recovery": "stale-asset"
      }
    });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-host", request.headers.get("host") ?? "localhost");

  if (request.nextUrl.pathname.startsWith("/admin") &&
      request.nextUrl.pathname !== "/admin/login") {
    const session = await verifyAdminSession(
      request.cookies.get("platzguide_session")?.value ?? request.cookies.get("explorer_session")?.value
    );
    if (!session) return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/_next/static/chunks/08dj8jc9ilu6-.js",
    "/_next/static/chunks/11c89nsesuvoe.js",
    "/_next/static/chunks/1yna4ah8qm5sj.css",
    "/((?!_next/static|_next/image|favicon.ico|icons).*)"
  ]
};
