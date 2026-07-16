import { describe, expect, it } from "vitest";
import { canManageTenant, canViewTenant } from "@/lib/auth";
import { applyBillingPlan } from "@/lib/billing";
import { resizeBoundsFromCorner } from "@/lib/map-bounds";
import { rateLimit } from "@/lib/rate-limit";
import { isPlatformHost, onlyTenantRecords, resolveTenant } from "@/lib/tenant-resolver";
import { createDefaultStationTemplates, tenantDefaults } from "@/lib/tenant-defaults";
import { mapStripeSubscriptionStatus } from "@/lib/stripe-status";
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
  it("resolves optional custom-domain host prefixes", () => {
    const tenants = [
      testTenant({ id: "tenant-a", slug: "platz-a", hosts: ["platz-a.localhost"], name: "Platz A" })
    ];
    expect(resolveTenant("platz-a.localhost:3000", tenants)?.slug).toBe("platz-a");
  });

  it("does not invent a tenant when none exists", () => {
    expect(resolveTenant("localhost:3000", [])).toBeUndefined();
  });

  it("does not expose the first tenant on unknown platform domains", () => {
    const tenants = [
      testTenant({ id: "tenant-a", slug: "platz-a", hosts: ["platz-a.localhost"], name: "Platz A" })
    ];
    expect(resolveTenant("platzguide.de", tenants)).toBeUndefined();
    expect(resolveTenant("unknown.example.org", tenants)).toBeUndefined();
  });

  it("treats the main product domain as the platform landing page", () => {
    expect(isPlatformHost("platzguide.de")).toBe(true);
    expect(isPlatformHost("www.platzguide.de")).toBe(true);
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

  it("creates standard stations as hidden templates for new tenants", () => {
    const templates = createDefaultStationTemplates("tenant-a");
    expect(templates.map((station) => station.name)).toEqual([
      "Rezeption",
      "Sanitärgebäude 1",
      "Sanitärgebäude 2",
      "Entsorgungsstation Abfall",
      "Entsorgung Toilette",
      "Spielplatz",
      "Restaurant"
    ]);
    expect(templates.every((station) => station.tenantId === "tenant-a" && station.isTemplate)).toBe(true);
  });

  it("applies the public pricing packages", () => {
    const tenant = testTenant({ id: "tenant-a", slug: "platz-a", hosts: ["platz-a.localhost"], name: "Platz A" });
    const starter = applyBillingPlan(tenant, "starter");
    const pro = applyBillingPlan(tenant, "pro");
    expect(starter.billing.monthlyPriceCents).toBe(499);
    expect(starter.billing.storageLimitMb).toBe(100);
    expect(starter.billing.supportResponseHours).toBe(24);
    expect(pro.billing.monthlyPriceCents).toBe(1999);
    expect(pro.billing.storageLimitMb).toBe(1024);
    expect(pro.billing.supportResponseHours).toBe(6);
  });

  it("maps Stripe subscription statuses to publication states", () => {
    expect(mapStripeSubscriptionStatus("active")).toBe("active");
    expect(mapStripeSubscriptionStatus("trialing")).toBe("active");
    expect(mapStripeSubscriptionStatus("past_due")).toBe("past_due");
    expect(mapStripeSubscriptionStatus("unpaid")).toBe("past_due");
    expect(mapStripeSubscriptionStatus("canceled")).toBe("blocked");
  });

  it("resizes the camp area rectangle from every corner", () => {
    const bounds: [[number, number], [number, number]] = [[10, 49], [11, 50]];
    expect(resizeBoundsFromCorner(bounds, 0, [10.2, 50.2])).toEqual([[10.2, 49], [11, 50.2]]);
    expect(resizeBoundsFromCorner(bounds, 1, [10.8, 50.2])).toEqual([[10, 49], [10.8, 50.2]]);
    expect(resizeBoundsFromCorner(bounds, 2, [10.8, 48.8])).toEqual([[10, 48.8], [10.8, 50]]);
    expect(resizeBoundsFromCorner(bounds, 3, [10.2, 48.8])).toEqual([[10.2, 48.8], [11, 50]]);
  });
});
