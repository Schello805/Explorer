import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createDefaultStationTemplates, tenantDefaults } from "../../src/lib/tenant-defaults";
import type { Tenant } from "../../src/lib/types";

export default async function globalSetup() {
  const dataDirectory = path.join(process.cwd(), ".playwright-data");
  await rm(dataDirectory, { recursive: true, force: true });
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(path.join(dataDirectory, "tenants.json"), JSON.stringify([
    testTenant("11111111-1111-4111-8111-111111111111", "testplatz", "Camping Testplatz"),
    testTenant("44444444-4444-4444-8444-444444444444", "publishplatz", "Camping Publishplatz")
  ], null, 2));
}

function testTenant(tenantId: string, slug: string, name: string): Tenant {
  return {
    ...structuredClone(tenantDefaults),
    id: tenantId,
    slug,
    hosts: [`${slug}.localhost`],
    name,
    tagline: "Testen ohne Veröffentlichung.",
    logoMark: "T",
    contact: { phone: "+49 123 456789", email: "test@example.org", emergency: "112" },
    map: {
      ...tenantDefaults.map,
      center: [10.56, 49.16],
      zoom: 16,
      configured: true
    },
    billing: {
      ...tenantDefaults.billing,
      publicEnabled: false,
      status: "trial"
    },
    stations: createDefaultStationTemplates(tenantId),
    users: [{
      id: "22222222-2222-4222-8222-222222222222",
      tenantId,
      email: "betreiber@example.org",
      role: "tenant-owner",
      emailVerifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }],
    auditLog: [{
      id: "33333333-3333-4333-8333-333333333333",
      tenantId,
      actorEmail: "admin@schellenberger.biz",
      action: "create",
      entityType: "tenant",
      entityId: tenantId,
      createdAt: new Date().toISOString()
    }]
  };
}
