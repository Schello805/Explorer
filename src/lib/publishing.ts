import "server-only";

import { saveTenantConfiguration } from "@/lib/tenant-store";
import type { Tenant, TenantPublicSnapshot } from "@/lib/types";

export function publicTenantFor(tenant: Tenant) {
  const latest = tenant.publishing?.versions?.[0];
  return latest?.tenant ?? tenant;
}

export function canShowPublicTenant(tenant: Tenant) {
  return tenant.billing.status === "active" && tenant.billing.publicEnabled && !tenant.archivedAt && Boolean(tenant.publishing?.versions?.length);
}

export async function publishTenant(tenant: Tenant, actorEmail: string) {
  const version = (tenant.publishing?.publishedVersion ?? 0) + 1;
  const snapshot: TenantPublicSnapshot = {
    id: crypto.randomUUID(),
    version,
    createdAt: new Date().toISOString(),
    createdBy: actorEmail,
    tenant: stripPrivateTenantState({
      ...tenant,
      publishing: undefined
    } as Tenant)
  };
  const nextTenant: Tenant = {
    ...tenant,
    publishing: {
      hasUnpublishedChanges: false,
      publishedAt: snapshot.createdAt,
      publishedVersion: version,
      versions: [snapshot, ...(tenant.publishing?.versions ?? [])].slice(0, 5)
    },
    auditLog: [{
      id: crypto.randomUUID(),
      tenantId: tenant.id,
      actorEmail,
      action: "publish",
      entityType: "tenant",
      entityId: tenant.id,
      createdAt: snapshot.createdAt
    }, ...tenant.auditLog].slice(0, 100)
  };
  return saveTenantConfiguration(tenant.id, nextTenant, "publish-system");
}

export async function rollbackTenant(tenant: Tenant, versionId: string, actorEmail: string) {
  const snapshot = tenant.publishing?.versions.find((candidate) => candidate.id === versionId);
  if (!snapshot) throw new Error("Version nicht gefunden.");
  const nextTenant: Tenant = {
    ...tenant,
    ...snapshot.tenant,
    id: tenant.id,
    slug: tenant.slug,
    hosts: tenant.hosts,
    billing: tenant.billing,
    integrations: tenant.integrations,
    users: tenant.users,
    privacyRequests: tenant.privacyRequests,
    auditLog: [{
      id: crypto.randomUUID(),
      tenantId: tenant.id,
      actorEmail,
      action: "rollback",
      entityType: "tenant-version",
      entityId: snapshot.id,
      createdAt: new Date().toISOString()
    }, ...tenant.auditLog].slice(0, 100),
    publishing: {
      ...(tenant.publishing ?? { versions: [] }),
      hasUnpublishedChanges: true
    }
  };
  return saveTenantConfiguration(tenant.id, nextTenant, actorEmail);
}

export function markUnpublishedChanges(tenant: Tenant): Tenant {
  return {
    ...tenant,
    publishing: {
      hasUnpublishedChanges: true,
      publishedAt: tenant.publishing?.publishedAt,
      publishedVersion: tenant.publishing?.publishedVersion,
      versions: tenant.publishing?.versions ?? []
    }
  };
}

function stripPrivateTenantState(tenant: Tenant): TenantPublicSnapshot["tenant"] {
  return {
    ...tenant,
    publishing: undefined,
    auditLog: [],
    users: [],
    privacyRequests: []
  };
}
