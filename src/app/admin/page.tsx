import { AdminConsole } from "@/components/admin-console";
import { SystemError } from "@/components/system-error";
import { ADMIN_EMAIL, canViewTenant, verifyAdminSession } from "@/lib/auth";
import { listTenants } from "@/lib/tenant-store";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = await verifyAdminSession(
    cookieStore.get("platzguide_session")?.value ?? cookieStore.get("explorer_session")?.value
  );
  if (!session) redirect("/admin/login");
  let tenants;
  try {
    tenants = await listTenants();
  } catch (error) {
    console.error("Platzguide Admin konnte Mandanten nicht laden.", error);
    return <SystemError title="Admin-Daten nicht bereit" message="Der Adminbereich konnte die Mandanten nicht laden. Bitte PostgreSQL-Verbindung und Migrationen prüfen." />;
  }
  const visibleTenants = session.role === "platform-admin" && session.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    ? tenants
    : tenants.filter((candidate) => canViewTenant(session, candidate.id));
  const tenant = visibleTenants[0];
  if (!tenant) {
    return <SystemError title="Noch kein Campingplatz angelegt" message="Das System ist leer und enthält keine Demo-Daten. Lege zuerst einen Mandanten über die Startseite oder den Self-Service an." />;
  }
  return <AdminConsole tenant={tenant} tenants={visibleTenants} adminEmail={session.email} />;
}
