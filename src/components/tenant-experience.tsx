import { cookies } from "next/headers";
import { ConsentBanner } from "@/components/consent-banner";
import { Footer } from "@/components/footer";
import { MatomoTracker } from "@/components/matomo-tracker";
import { PlatzguideApp } from "@/components/platzguide-app";
import { PwaRegister } from "@/components/pwa-register";
import { SystemError } from "@/components/system-error";
import { canManageTenant, verifyAdminSession } from "@/lib/auth";
import { canShowPublicTenant, publicTenantFor } from "@/lib/publishing";
import type { Tenant } from "@/lib/types";

export async function TenantExperience({ tenant, basePath }: { tenant: Tenant; basePath: string }) {
  const cookieStore = await cookies();
  const session = await verifyAdminSession(
    cookieStore.get("platzguide_session")?.value ?? cookieStore.get("explorer_session")?.value
  );
  const adminPreview = Boolean(session && canManageTenant(session, tenant.id));
  if (!adminPreview && !canShowPublicTenant(tenant)) {
    return <SystemError title="Gerade nicht erreichbar." message="Dieser Platzguide ist momentan nicht öffentlich. Bitte versuche es später erneut." />;
  }
  const visibleTenant = adminPreview ? tenant : publicTenantFor(tenant);
  return <>
    <PwaRegister />
    <PlatzguideApp tenant={visibleTenant} basePath={basePath} />
    <Footer tenant={visibleTenant} basePath={basePath} />
    <ConsentBanner />
    <MatomoTracker tracking={visibleTenant.tracking} />
  </>;
}
