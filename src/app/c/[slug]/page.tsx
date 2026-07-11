import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TenantExperience } from "@/components/tenant-experience";
import { listTenants } from "@/lib/tenant-store";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tenant = (await listTenants()).find((candidate) => candidate.slug === slug);
  if (!tenant) return {};
  return {
    title: `${tenant.name} · Platzguide`,
    description: tenant.tagline,
    alternates: { canonical: `/c/${tenant.slug}` },
    openGraph: {
      title: `${tenant.name} · Platzguide`,
      description: tenant.tagline,
      url: `/c/${tenant.slug}`,
      type: "website"
    }
  };
}

export default async function TenantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenants = await listTenants();
  const tenant = tenants.find((candidate) => candidate.slug === slug);
  if (!tenant) notFound();
  return <TenantExperience tenant={tenant} basePath={`/c/${tenant.slug}`} />;
}
