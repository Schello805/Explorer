import { NoticesView } from "@/components/notices-view";
import { getTenant } from "@/lib/tenant";

export default async function NoticesPage() {
  const tenant = await getTenant();
  return <NoticesView tenant={tenant} backHref="/" />;
}
