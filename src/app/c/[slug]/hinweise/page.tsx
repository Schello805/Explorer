import { notFound } from "next/navigation";
import { NoticesView } from "@/components/notices-view";
import { listTenants } from "@/lib/tenant-store";

export const dynamic = "force-dynamic";

export default async function TenantNoticesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = (await listTenants()).find((candidate) => candidate.slug === slug);
  if (!tenant) notFound();
  return <NoticesView tenant={tenant} backHref={`/c/${tenant.slug}`} />;
}
