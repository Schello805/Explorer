import { notFound } from "next/navigation";
import { LegalView, legalTitles, type LegalDocument } from "@/components/legal-view";
import { listTenants } from "@/lib/tenant-store";

export const dynamic = "force-dynamic";

export default async function TenantLegalPage({ params }: { params: Promise<{ slug: string; document: string }> }) {
  const { slug, document } = await params;
  if (!(document in legalTitles)) notFound();
  const tenant = (await listTenants()).find((candidate) => candidate.slug === slug);
  if (!tenant) notFound();
  return <LegalView tenant={tenant} document={document as LegalDocument} backHref={`/c/${tenant.slug}`} />;
}
