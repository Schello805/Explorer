import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PlatformLanding } from "@/components/platform-landing";
import { SystemError } from "@/components/system-error";
import { TenantExperience } from "@/components/tenant-experience";
import { isMarketingDemoTenant, publicTenantFor } from "@/lib/publishing";
import { isPlatformHost, resolveTenant } from "@/lib/tenant-resolver";
import { listTenants } from "@/lib/tenant-store";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ camp?: string }> }) {
  const params = await searchParams;
  if (params.camp) redirect(`/c/${params.camp}`);
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-tenant-host") ?? requestHeaders.get("host") ?? "localhost";
  let tenants;
  try {
    tenants = await listTenants();
  } catch (error) {
    console.error("Platzguide Startseite konnte Mandanten nicht laden.", error);
    return <SystemError title="Datenbank nicht bereit" message="Die App konnte die Mandantendaten nicht laden. Bitte PostgreSQL-Verbindung und Migrationen prüfen." />;
  }
  if (isPlatformHost(host)) {
    const demoCandidate = tenants.find(isMarketingDemoTenant);
    const demoTenant = demoCandidate && !demoCandidate.archivedAt ? publicTenantFor(demoCandidate) : undefined;
    return <PlatformLanding
      allowSignup={process.env.ALLOW_PUBLIC_SIGNUP === "true"}
      captchaProvider={process.env.CAPTCHA_PROVIDER === "turnstile" || process.env.CAPTCHA_PROVIDER === "hcaptcha" || process.env.CAPTCHA_PROVIDER === "recaptcha" ? process.env.CAPTCHA_PROVIDER : "disabled"}
      captchaSiteKey={process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY ?? ""}
      demoTenant={demoTenant}
    />;
  }
  const tenant = resolveTenant(host, tenants);
  if (!tenant) {
    return <SystemError title="Campingplatz nicht gefunden" message="Für diese Domain ist noch kein Mandant eingerichtet." />;
  }
  return <TenantExperience tenant={tenant} basePath="" />;
}
