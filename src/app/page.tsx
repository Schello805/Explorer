import { ConsentBanner } from "@/components/consent-banner";
import { PlatzguideApp } from "@/components/platzguide-app";
import { Footer } from "@/components/footer";
import { PlatformLanding } from "@/components/platform-landing";
import { PwaRegister } from "@/components/pwa-register";
import { SystemError } from "@/components/system-error";
import { headers } from "next/headers";
import { isPlatformHost } from "@/lib/tenant-resolver";
import { getTenant } from "@/lib/tenant";
import { listTenants } from "@/lib/tenant-store";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ camp?: string }> }) {
  const params = await searchParams;
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-tenant-host") ?? requestHeaders.get("host") ?? "localhost";
  let tenants;
  try {
    tenants = await listTenants();
  } catch (error) {
    console.error("Platzguide Startseite konnte Mandanten nicht laden.", error);
    return <SystemError title="Datenbank nicht bereit" message="Die App konnte die Mandantendaten nicht laden. Bitte PostgreSQL-Verbindung und Migrationen prüfen." />;
  }
  const queryTenant = params.camp ? tenants.find((candidate) => candidate.slug === params.camp) : undefined;
  if (!queryTenant && isPlatformHost(host)) {
    return <PlatformLanding
      allowSignup={process.env.ALLOW_PUBLIC_SIGNUP === "true"}
      captchaProvider={process.env.CAPTCHA_PROVIDER === "turnstile" || process.env.CAPTCHA_PROVIDER === "hcaptcha" ? process.env.CAPTCHA_PROVIDER : "disabled"}
      captchaSiteKey={process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY ?? ""}
    />;
  }
  const tenant = queryTenant ?? await getTenant();
  return <>
    <PwaRegister />
    <PlatzguideApp tenant={tenant} />
    <Footer tenant={tenant} />
    <ConsentBanner />
  </>;
}
