import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PlatformAdminConsole } from "@/components/platform-admin-console";
import { SystemError } from "@/components/system-error";
import { ADMIN_EMAIL, verifyAdminSession } from "@/lib/auth";
import { listTenants } from "@/lib/tenant-store";

export const dynamic = "force-dynamic";

export default async function PlatformAdminPage() {
  const cookieStore = await cookies();
  const session = await verifyAdminSession(
    cookieStore.get("platzguide_session")?.value ?? cookieStore.get("explorer_session")?.value
  );
  if (!session) redirect("/admin/login");
  if (session.role !== "platform-admin" || session.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) redirect("/admin/tenant");
  let tenants;
  try {
    tenants = await listTenants();
  } catch (error) {
    console.error("Platzguide Plattformadmin konnte Mandanten nicht laden.", error);
    return <SystemError title="Admin-Daten nicht bereit" message="Der Plattformbereich konnte die Mandanten nicht laden. Bitte PostgreSQL-Verbindung und Migrationen prüfen." />;
  }
  return <PlatformAdminConsole adminEmail={session.email} tenants={tenants} />;
}
