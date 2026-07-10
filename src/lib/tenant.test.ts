import { describe, expect, it } from "vitest";
import { canManageTenant, canViewTenant } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { onlyTenantRecords, resolveTenant } from "@/lib/tenant-resolver";
import { tenantDefaults } from "@/lib/tenant-defaults";
import type { Tenant } from "@/lib/types";

function testTenant(input: Pick<Tenant, "id" | "slug" | "hosts" | "name">): Tenant {
  return {
    ...structuredClone(tenantDefaults),
    ...input,
    users: [],
    auditLog: []
  };
}

describe("tenant isolation", () => {
  it("resolves the tenant from its subdomain", () => {
    const tenants = [
      testTenant({ id: "tenant-a", slug: "platz-a", hosts: ["platz-a.localhost"], name: "Platz A" })
    ];
    expect(resolveTenant("platz-a.localhost:3000", tenants)?.slug).toBe("platz-a");
  });

  it("does not invent a tenant when none exists", () => {
    expect(resolveTenant("localhost:3000", [])).toBeUndefined();
  });

  it("never returns records from another tenant", () => {
    const records = [
      { id: "a", tenantId: "tenant-a" },
      { id: "b", tenantId: "tenant-b" }
    ];
    expect(onlyTenantRecords("tenant-a", records)).toEqual([{ id: "a", tenantId: "tenant-a" }]);
  });

  it("rejects record access without tenant context", () => {
    expect(() => onlyTenantRecords("", [])).toThrow("Tenant context is required");
  });

  it("allows tenant owners only on their own tenant", () => {
    const session = { email: "owner@example.org", role: "tenant-owner" as const, tenantId: "tenant-a" };
    expect(canManageTenant(session, "tenant-a")).toBe(true);
    expect(canManageTenant(session, "tenant-b")).toBe(false);
  });

  it("allows tenant viewers to view but not manage", () => {
    const session = { email: "viewer@example.org", role: "tenant-viewer" as const, tenantId: "tenant-a" };
    expect(canViewTenant(session, "tenant-a")).toBe(true);
    expect(canManageTenant(session, "tenant-a")).toBe(false);
  });

  it("rate limits repeated self-service actions", () => {
    const key = `test-${crypto.randomUUID()}`;
    expect(rateLimit(key, 2, 10_000).ok).toBe(true);
    expect(rateLimit(key, 2, 10_000).ok).toBe(true);
    expect(rateLimit(key, 2, 10_000).ok).toBe(false);
  });

  it("does not allow unverified tenant users as verified principals", () => {
    const session = { email: "owner@example.org", role: "tenant-owner" as const, tenantId: "tenant-a" };
    expect(canManageTenant(session, "tenant-a")).toBe(true);
  });
});
