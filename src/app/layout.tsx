import type { Metadata, Viewport } from "next";
import "@/app/globals.css";
import { getTenant } from "@/lib/tenant";
import { tenantDefaults } from "@/lib/tenant-defaults";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant().catch(() => null);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://platzguide.de";
  const platformTitle = "Platzguide · Mobile Campingplatz-App mit Subdomain und Adminbereich";
  const platformDescription = "Platzguide ist die mobile-first PWA für Campingplätze: Karte, Stationen, Gästemappe, Events, Rechtstexte und mandantenfähiger Adminbereich.";
  return {
    metadataBase: new URL(baseUrl),
    title: tenant ? `${tenant.name} · Platzguide` : platformTitle,
    description: tenant?.tagline ?? platformDescription,
    alternates: { canonical: tenant ? "/" : baseUrl },
    keywords: ["Campingplatz App", "Camping PWA", "digitale Gästemappe", "Campingplatz Karte", "Platzguide", "Subdomain Campingplatz"],
    openGraph: {
      title: tenant ? `${tenant.name} · Platzguide` : platformTitle,
      description: tenant?.tagline ?? platformDescription,
      url: tenant ? "/" : baseUrl,
      siteName: "Platzguide",
      locale: "de_DE",
      type: "website",
      images: [{ url: "/icons/platzguide-logo.png", width: 512, height: 512, alt: "Platzguide Logo" }]
    },
    twitter: {
      card: "summary",
      title: tenant ? `${tenant.name} · Platzguide` : platformTitle,
      description: tenant?.tagline ?? platformDescription,
      images: ["/icons/platzguide-logo.png"]
    },
    manifest: "/manifest.webmanifest",
    icons: {
      icon: "/icons/platzguide-logo.png",
      apple: "/icons/platzguide-logo.png"
    },
    appleWebApp: { capable: true, title: tenant?.name ?? "Platzguide", statusBarStyle: "default" }
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#195f4c"
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const tenant = await getTenant().catch(() => null);
  const theme = tenant?.theme ?? tenantDefaults.theme;
  return (
    <html lang="de" style={{
      "--primary": theme.primary,
      "--secondary": theme.secondary,
      "--surface": theme.surface
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
