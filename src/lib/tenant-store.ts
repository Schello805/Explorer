import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { tenants as seedTenants } from "@/lib/demo-data";
import type { FeedbackMessage, Station, Tenant } from "@/lib/types";

const dataDirectory = path.join(process.cwd(), ".data");
const dataFile = path.join(dataDirectory, "tenants.json");

async function readLocalTenants(): Promise<Tenant[]> {
  try {
    return (JSON.parse(await readFile(dataFile, "utf8")) as Tenant[]).map(normalizeTenant);
  } catch {
    await mkdir(dataDirectory, { recursive: true });
    await writeFile(dataFile, JSON.stringify(seedTenants, null, 2));
    return structuredClone(seedTenants);
  }
}

async function writeLocalTenants(tenants: Tenant[]) {
  await mkdir(dataDirectory, { recursive: true });
  const temporaryFile = `${dataFile}.tmp`;
  await writeFile(temporaryFile, JSON.stringify(tenants, null, 2));
  await rename(temporaryFile, dataFile);
}

async function readPostgresTenants(): Promise<Tenant[]> {
  const sql = postgres(process.env.DATABASE_URL!, { max: 5 });
  try {
    const rows = await sql<{ configuration: Tenant }[]>`
      SELECT configuration FROM tenants ORDER BY created_at
    `;
    return rows.map((row) => normalizeTenant(row.configuration));
  } finally {
    await sql.end();
  }
}

function normalizeTenant(tenant: Tenant): Tenant {
  const seed = seedTenants.find((candidate) => candidate.id === tenant.id) ?? seedTenants[0];
  return {
    ...seed,
    ...tenant,
    theme: { ...seed.theme, ...tenant.theme },
    map: { ...seed.map, ...tenant.map },
    contact: { ...seed.contact, ...tenant.contact },
    legal: { ...seed.legal, ...tenant.legal },
    tracking: { ...seed.tracking, ...tenant.tracking },
    email: { ...seed.email, ...tenant.email },
    features: { ...seed.features, ...tenant.features },
    categories: tenant.categories ?? seed.categories,
    stations: tenant.stations ?? [],
    media: tenant.media ?? [],
    events: tenant.events ?? [],
    tours: tenant.tours ?? [],
    rewards: tenant.rewards ?? [],
    guestGuide: tenant.guestGuide ?? [],
    feedback: tenant.feedback ?? [],
    auditLog: tenant.auditLog ?? []
  };
}

export async function listTenants(): Promise<Tenant[]> {
  return process.env.DATABASE_URL
    ? readPostgresTenants()
    : readLocalTenants();
}

export async function saveTenantConfiguration(tenantId: string, tenant: Tenant, actorEmail: string) {
  if (tenant.id !== tenantId) throw new Error("Cross-tenant configuration write rejected");
  const normalized = normalizeTenant(tenant);
  if (process.env.DATABASE_URL) {
    const sql = postgres(process.env.DATABASE_URL, { max: 1 });
    try {
      await sql.begin(async (transaction) => {
        await transaction`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
        await transaction`
          UPDATE tenants SET
            slug = ${normalized.slug},
            name = ${normalized.name},
            hosts = ${normalized.hosts},
            configuration = ${transaction.json(normalized)},
            updated_at = now()
          WHERE id = ${tenantId}
        `;
        await transaction`
          INSERT INTO audit_log (tenant_id, actor_email, action, entity_type, entity_id, changes)
          VALUES (${tenantId}, ${actorEmail}, 'update', 'tenant', ${tenantId}, ${transaction.json({ sections: "configuration" })})
        `;
      });
    } finally {
      await sql.end();
    }
    return normalized;
  }

  const tenants = await readLocalTenants();
  const index = tenants.findIndex((candidate) => candidate.id === tenantId);
  if (index < 0) throw new Error("Tenant not found");
  const auditEntry = {
    id: crypto.randomUUID(),
    tenantId,
    actorEmail,
    action: "update",
    entityType: "tenant",
    entityId: tenantId,
    createdAt: new Date().toISOString()
  };
  tenants[index] = normalizeTenant({
    ...normalized,
    auditLog: [auditEntry, ...(normalized.auditLog ?? [])].slice(0, 100)
  });
  await writeLocalTenants(tenants);
  return tenants[index];
}

export async function saveStation(tenantId: string, station: Station, actorEmail: string) {
  if (station.tenantId !== tenantId) throw new Error("Cross-tenant write rejected");
  if (process.env.DATABASE_URL) {
    const sql = postgres(process.env.DATABASE_URL, { max: 1 });
    try {
      await sql.begin(async (transaction) => {
        await transaction`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
        await transaction`
          INSERT INTO stations (id, tenant_id, category_id, name, description, status, latitude, longitude, data)
          VALUES (${station.id}, ${tenantId}, ${station.categoryId}, ${station.name}, ${station.description},
            ${station.status}, ${station.latitude}, ${station.longitude}, ${transaction.json(station)})
          ON CONFLICT (id) DO UPDATE SET
            category_id = EXCLUDED.category_id, name = EXCLUDED.name, description = EXCLUDED.description,
            status = EXCLUDED.status, latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude, data = EXCLUDED.data, updated_at = now()
        `;
        await transaction`
          INSERT INTO audit_log (tenant_id, actor_email, action, entity_type, entity_id, changes)
          VALUES (${tenantId}, ${actorEmail}, 'upsert', 'station', ${station.id}, ${transaction.json(station)})
        `;
      });
    } finally {
      await sql.end();
    }
    return station;
  }

  const tenants = await readLocalTenants();
  const tenant = tenants.find((candidate) => candidate.id === tenantId);
  if (!tenant) throw new Error("Tenant not found");
  const index = tenant.stations.findIndex((candidate) => candidate.id === station.id);
  if (index >= 0) tenant.stations[index] = station;
  else tenant.stations.unshift(station);
  await writeLocalTenants(tenants);
  return station;
}

export async function deleteStation(tenantId: string, stationId: string, actorEmail: string) {
  if (process.env.DATABASE_URL) {
    const sql = postgres(process.env.DATABASE_URL, { max: 1 });
    try {
      await sql.begin(async (transaction) => {
        await transaction`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
        await transaction`DELETE FROM stations WHERE id = ${stationId} AND tenant_id = ${tenantId}`;
        await transaction`
          INSERT INTO audit_log (tenant_id, actor_email, action, entity_type, entity_id)
          VALUES (${tenantId}, ${actorEmail}, 'delete', 'station', ${stationId})
        `;
      });
    } finally {
      await sql.end();
    }
    return;
  }
  const tenants = await readLocalTenants();
  const tenant = tenants.find((candidate) => candidate.id === tenantId);
  if (!tenant) throw new Error("Tenant not found");
  tenant.stations = tenant.stations.filter((station) => station.id !== stationId);
  await writeLocalTenants(tenants);
}

export async function saveFeedback(tenantId: string, message: Omit<FeedbackMessage, "id" | "tenantId" | "status" | "createdAt">) {
  const feedback: FeedbackMessage = {
    id: crypto.randomUUID(),
    tenantId,
    status: "new",
    createdAt: new Date().toISOString(),
    ...message
  };

  if (process.env.DATABASE_URL) {
    const tenants = await readPostgresTenants();
    const tenant = tenants.find((candidate) => candidate.id === tenantId);
    if (!tenant) throw new Error("Tenant not found");
    return saveTenantConfiguration(tenantId, { ...tenant, feedback: [feedback, ...tenant.feedback] }, "visitor");
  }

  const tenants = await readLocalTenants();
  const tenant = tenants.find((candidate) => candidate.id === tenantId);
  if (!tenant) throw new Error("Tenant not found");
  tenant.feedback = [feedback, ...tenant.feedback].slice(0, 500);
  await writeLocalTenants(tenants);
  return feedback;
}
