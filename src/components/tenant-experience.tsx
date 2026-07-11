import { cookies } from "next/headers";
import { ConsentBanner } from "@/components/consent-banner";
import { Footer } from "@/components/footer";
import { PlatzguideApp } from "@/components/platzguide-app";
import { PwaRegister } from "@/components/pwa-register";
import { SystemError } from "@/components/system-error";
import { canManageTenant, verifyAdminSession } from "@/lib/auth";
import type { Tenant } from "@/lib/types";

export async function TenantExperience({ tenant, basePath }: { tenant: Tenant; basePath: string }) {
  if (!tenant.billing.publicEnabled || tenant.billing.status !== "active") {
    const cookieStore = await cookies();
    const session = await verifyAdminSession(
      cookieStore.get("platzguide_session")?.value ?? cookieStore.get("explorer_session")?.value
    );
    if (!session || !canManageTenant(session, tenant.id)) {
      return <SystemError title="Noch nicht veröffentlicht" message="Dieser Platzguide ist eingerichtet, aber noch nicht öffentlich freigeschaltet. Der Betreiber kann ihn im Adminbereich testen; Besucher sehen ihn erst nach Freigabe." />;
    }
  }
  return <>
    <PwaRegister />
    <PlatzguideApp tenant={tenant} basePath={basePath} />
    <Footer tenant={tenant} basePath={basePath} />
    <ConsentBanner />
  </>;
}
