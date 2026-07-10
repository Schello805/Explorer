import { AdminConsole } from "@/components/admin-console";
import { ADMIN_EMAIL } from "@/lib/auth";
import { getTenant } from "@/lib/tenant";
import { listTenants } from "@/lib/tenant-store";

export default async function AdminPage() {
  const tenant = await getTenant();
  const tenants = await listTenants();
  return <AdminConsole tenant={tenant} tenants={tenants} adminEmail={ADMIN_EMAIL} />;
}
