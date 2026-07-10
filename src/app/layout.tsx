import type { Metadata, Viewport } from "next";
import "@/app/globals.css";
import { getTenant } from "@/lib/tenant";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  return {
    title: `${tenant.name} · Platzguide`,
    description: tenant.tagline,
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: tenant.name, statusBarStyle: "default" }
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#195f4c"
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const tenant = await getTenant();
  return (
    <html lang="de" style={{
      "--primary": tenant.theme.primary,
      "--secondary": tenant.theme.secondary,
      "--surface": tenant.theme.surface
    } as React.CSSProperties}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: chunkRecoveryScript }} />
        {children}
      </body>
    </html>
  );
}

const chunkRecoveryScript = `
(function () {
  var key = "platzguide-chunk-recovery-v1";
  function isChunkError(value) {
    var text = String((value && (value.message || value.reason && value.reason.message)) || value || "");
    return text.indexOf("ChunkLoadError") !== -1 ||
      text.indexOf("Failed to load chunk") !== -1 ||
      text.indexOf("Loading chunk") !== -1 ||
      text.indexOf("/_next/static/chunks/") !== -1;
  }
  function recover(value) {
    if (!isChunkError(value)) return;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    Promise.all([
      "caches" in window ? caches.keys().then(function (keys) { return Promise.all(keys.map(function (name) { return caches.delete(name); })); }) : Promise.resolve(),
      "serviceWorker" in navigator ? navigator.serviceWorker.getRegistrations().then(function (registrations) { return Promise.all(registrations.map(function (registration) { return registration.unregister(); })); }) : Promise.resolve()
    ]).finally(function () {
      location.reload();
    });
  }
  window.addEventListener("error", function (event) { recover(event.error || event.message || event.filename); }, true);
  window.addEventListener("unhandledrejection", function (event) { recover(event.reason); });
})();`;
