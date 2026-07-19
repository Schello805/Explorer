import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminConsole } from "@/components/admin-console";
import { SystemError } from "@/components/system-error";
import { canViewTenant, isPlatformAdminSession, verifyAdminSession } from "@/lib/auth";
import { readPlatformSettings } from "@/lib/platform-settings";
import { listTenants } from "@/lib/tenant-store";

export const dynamic = "force-dynamic";

export default async function TenantAdminPage({ searchParams }: { searchParams: Promise<{ tenant?: string }> }) {
  const { tenant: requestedTenant } = await searchParams;
  const cookieStore = await cookies();
  const session = await verifyAdminSession(
    cookieStore.get("platzguide_session")?.value ?? cookieStore.get("explorer_session")?.value
  );
  if (!session) redirect("/admin/login");
  let tenants;
  try {
    tenants = await listTenants();
  } catch (error) {
    console.error("Platzguide Mandantenadmin konnte Mandanten nicht laden.", error);
    return <SystemError title="Admin nicht erreichbar." message="Die Campingplätze konnten gerade nicht geladen werden." />;
  }
  const isPlatformAdmin = isPlatformAdminSession(session);
  const visibleTenants = isPlatformAdmin
    ? tenants
    : tenants.filter((candidate) => canViewTenant(session, candidate.id));
  const tenant = visibleTenants.find((candidate) => candidate.slug === requestedTenant || candidate.id === requestedTenant) ?? visibleTenants[0];
  if (!tenant) {
    if (isPlatformAdmin) redirect("/admin/platform");
    return <SystemError title="Kein Campingplatz zugeordnet." message="Bitte wende dich an den Platzguide-Admin." />;
  }
  const platformSettings = await readPlatformSettings();
  return <AdminConsole tenant={tenant} tenants={visibleTenants} adminEmail={session.email} isPlatformAdmin={isPlatformAdmin} tenantAdminPermissions={platformSettings.tenantAdminPermissions} />;
}
