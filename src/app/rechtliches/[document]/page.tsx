import { notFound } from "next/navigation";
import { LegalView, legalTitles, type LegalDocument } from "@/components/legal-view";
import { getTenant } from "@/lib/tenant";
import { readPlatformLegal } from "@/lib/platform-legal";
import { tenantDefaults } from "@/lib/tenant-defaults";
import type { Tenant } from "@/lib/types";

export default async function LegalPage({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params;
  if (!(document in legalTitles)) notFound();
  const legal = await readPlatformLegal();
  const tenant = await getTenant().catch(() => ({
    ...tenantDefaults,
    legal,
    id: "platform",
    slug: "platform",
    hosts: ["platzguide.de"],
    name: "Platzguide",
    users: [],
    auditLog: []
  } satisfies Tenant));
  tenant.legal = legal;
  return <LegalView tenant={tenant} document={document as LegalDocument} backHref="/" />;
}
