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
      <body>{children}</body>
    </html>
  );
}
