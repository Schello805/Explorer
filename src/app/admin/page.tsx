import { AdminConsole } from "@/components/admin-console";
import { SystemError } from "@/components/system-error";
import { ADMIN_EMAIL } from "@/lib/auth";
import { getTenant } from "@/lib/tenant";
import { listTenants } from "@/lib/tenant-store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let tenant;
  let tenants;
  try {
    tenant = await getTenant();
    tenants = await listTenants();
  } catch (error) {
    console.error("Platzguide Admin konnte Mandanten nicht laden.", error);
    return <SystemError title="Admin-Daten nicht bereit" message="Der Adminbereich konnte die Mandanten nicht laden. Bitte PostgreSQL-Verbindung und Migrationen prüfen." />;
  }
  return <AdminConsole tenant={tenant} tenants={tenants} adminEmail={ADMIN_EMAIL} />;
}
