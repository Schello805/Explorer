import { describe, expect, it } from "vitest";
import { onlyTenantRecords, resolveTenant } from "@/lib/tenant-resolver";

describe("tenant isolation", () => {
  it("resolves the tenant from its subdomain", () => {
    expect(resolveTenant("sonnental.localhost:3000").slug).toBe("sonnental");
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
});
