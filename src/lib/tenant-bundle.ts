import "server-only";

import { createDefaultStationTemplates, tenantDefaults } from "@/lib/tenant-defaults";
import type { Tenant } from "@/lib/types";

export type TenantBundle = {
  format: "platzguide-tenant-bundle";
  version: 1;
  exportedAt: string;
  tenant: Omit<Tenant, "id" | "slug" | "hosts" | "users" | "auditLog" | "privacyRequests" | "billing">;
};

export function createTenantBundle(tenant: Tenant): TenantBundle {
  const { id: _id, slug: _slug, hosts: _hosts, users: _users, auditLog: _auditLog, privacyRequests: _privacyRequests, billing: _billing, ...exportable } = tenant;
  void _id; void _slug; void _hosts; void _users; void _auditLog; void _privacyRequests; void _billing;
  return {
    format: "platzguide-tenant-bundle",
    version: 1,
    exportedAt: new Date().toISOString(),
    tenant: exportable
  };
}

export function applyTenantBundle(target: Tenant, bundle: TenantBundle): Tenant {
  if (bundle.format !== "platzguide-tenant-bundle" || bundle.version !== 1) throw new Error("Ungültiges Platzguide-Bundle.");
  const remappedStations = (bundle.tenant.stations ?? []).map((station) => ({
    ...station,
    id: crypto.randomUUID(),
    tenantId: target.id
  }));
  return {
    ...target,
    ...bundle.tenant,
    id: target.id,
    slug: target.slug,
    hosts: target.hosts,
    billing: target.billing,
    integrations: target.integrations,
    users: target.users,
    auditLog: target.auditLog,
    privacyRequests: target.privacyRequests,
    stations: remappedStations.length ? remappedStations : createDefaultStationTemplates(target.id),
    categories: bundle.tenant.categories?.length ? bundle.tenant.categories : tenantDefaults.categories,
    publishing: {
      hasUnpublishedChanges: true,
      publishedAt: target.publishing?.publishedAt,
      publishedVersion: target.publishing?.publishedVersion,
      versions: target.publishing?.versions ?? []
    }
  };
}
