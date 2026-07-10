import { ConsentBanner } from "@/components/consent-banner";
import { PlatzguideApp } from "@/components/platzguide-app";
import { Footer } from "@/components/footer";
import { PlatformLanding } from "@/components/platform-landing";
import { PwaRegister } from "@/components/pwa-register";
import { headers } from "next/headers";
import { isPlatformHost } from "@/lib/tenant-resolver";
import { getTenant } from "@/lib/tenant";
import { listTenants } from "@/lib/tenant-store";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ camp?: string }> }) {
  const params = await searchParams;
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-tenant-host") ?? requestHeaders.get("host") ?? "localhost";
  const tenants = await listTenants();
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
