import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminConsole } from "@/components/admin-console";
import { SystemError } from "@/components/system-error";
import { canViewTenant, isPlatformAdminSession, verifyAdminSession } from "@/lib/auth";
import { listTenants } from "@/lib/tenant-store";

export const dynamic = "force-dynamic";

export default async function TenantAdminPage() {
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
    return <SystemError title="Admin-Daten nicht bereit" message="Der Mandantenbereich konnte die Campingplätze nicht laden. Bitte PostgreSQL-Verbindung und Migrationen prüfen." />;
  }
  const isPlatformAdmin = isPlatformAdminSession(session);
  const visibleTenants = isPlatformAdmin
    ? tenants
    : tenants.filter((candidate) => canViewTenant(session, candidate.id));
  const tenant = visibleTenants[0];
  if (!tenant) {
    if (isPlatformAdmin) redirect("/admin/platform");
    return <SystemError title="Noch kein Campingplatz zugeordnet" message="Deinem Zugang ist noch kein Campingplatz zugeordnet." />;
  }
  return <AdminConsole tenant={tenant} tenants={visibleTenants} adminEmail={session.email} isPlatformAdmin={isPlatformAdmin} />;
}
