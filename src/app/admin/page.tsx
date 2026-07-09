import { AdminConsole } from "@/components/admin-console";
import { ADMIN_EMAIL } from "@/lib/auth";
import { getTenant } from "@/lib/tenant";

export default async function AdminPage() {
  const tenant = await getTenant();
  return <AdminConsole tenant={tenant} adminEmail={ADMIN_EMAIL} />;
}
