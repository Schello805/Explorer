import { AdminConsole } from "@/components/admin-console";
import { SystemError } from "@/components/system-error";
import { ADMIN_EMAIL } from "@/lib/auth";
import { listTenants } from "@/lib/tenant-store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let tenants;
  try {
    tenants = await listTenants();
  } catch (error) {
    console.error("Platzguide Admin konnte Mandanten nicht laden.", error);
    return <SystemError title="Admin-Daten nicht bereit" message="Der Adminbereich konnte die Mandanten nicht laden. Bitte PostgreSQL-Verbindung und Migrationen prüfen." />;
  }
  const tenant = tenants[0];
  if (!tenant) {
    return <SystemError title="Noch kein Campingplatz angelegt" message="Das System ist leer und enthält keine Demo-Daten. Lege zuerst einen Mandanten über die Startseite oder den Self-Service an." />;
  }
  return <AdminConsole tenant={tenant} tenants={tenants} adminEmail={ADMIN_EMAIL} />;
}
