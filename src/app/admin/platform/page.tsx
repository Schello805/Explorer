import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PlatformAdminConsole } from "@/components/platform-admin-console";
import { SystemError } from "@/components/system-error";
import { isPlatformAdminSession, verifyAdminSession } from "@/lib/auth";
import { listTenants } from "@/lib/tenant-store";

export const dynamic = "force-dynamic";

export default async function PlatformAdminPage() {
  const cookieStore = await cookies();
  const session = await verifyAdminSession(
    cookieStore.get("platzguide_session")?.value ?? cookieStore.get("explorer_session")?.value
  );
  if (!session) redirect("/admin/login");
  if (!isPlatformAdminSession(session)) redirect("/admin/tenant");
  let tenants;
  try {
    tenants = await listTenants();
  } catch (error) {
    console.error("Platzguide Plattformadmin konnte Mandanten nicht laden.", error);
    return <SystemError title="Admin nicht erreichbar." message="Die Verwaltungsdaten konnten gerade nicht geladen werden." />;
  }
  return <PlatformAdminConsole adminEmail={session.email} tenants={tenants} />;
}
