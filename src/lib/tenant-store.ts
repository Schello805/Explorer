import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import postgres from "postgres";
import { applyBillingPlan } from "@/lib/billing";
import { appUrl, sendMail, tenantAdminUrl, tenantPublicUrl } from "@/lib/mail";
import { createDefaultStationTemplates, tenantDefaults } from "@/lib/tenant-defaults";
import type { AuditEntry, FeedbackMessage, PrivacyRequest, Station, Tenant } from "@/lib/types";

const dataDirectory = process.env.PLATZGUIDE_DATA_DIR ?? path.join(process.cwd(), ".data");
const dataFile = path.join(dataDirectory, "tenants.json");

async function readLocalTenants(): Promise<Tenant[]> {
  try {
    return (JSON.parse(await readFile(dataFile, "utf8")) as Tenant[]).map(normalizeTenant);
  } catch {
    await mkdir(dataDirectory, { recursive: true });
    await writeFile(dataFile, JSON.stringify([], null, 2));
    return [];
  }
}

async function writeLocalTenants(tenants: Tenant[]) {
  await mkdir(dataDirectory, { recursive: true });
  const temporaryFile = `${dataFile}.tmp`;
  await writeFile(temporaryFile, JSON.stringify(tenants, null, 2));
  await rename(temporaryFile, dataFile);
}

async function readPostgresTenants(): Promise<Tenant[]> {
  const sql = postgres(process.env.DATABASE_URL!, { connect_timeout: 3, idle_timeout: 5, max: 5 });
  try {
    return await sql.begin(async (transaction) => {
      await transaction`SELECT set_config('app.platform_admin', 'true', true)`;
      const tenantRows = await transaction<{ id: string; configuration: Tenant }[]>`
        SELECT id, configuration FROM tenants ORDER BY created_at
      `;
      const stationRows = await transaction<{ tenant_id: string; data: Station }[]>`
        SELECT tenant_id, data FROM stations ORDER BY updated_at DESC
      `;
      const stationsByTenant = new Map<string, Station[]>();
      for (const row of stationRows) {
        stationsByTenant.set(row.tenant_id, [...(stationsByTenant.get(row.tenant_id) ?? []), row.data]);
      }
      return tenantRows.map((row) => normalizeTenant({
        ...row.configuration,
        id: row.id,
        stations: stationsByTenant.get(row.id) ?? row.configuration.stations ?? []
      }));
    });
  } finally {
    await sql.end();
  }
}

function normalizeTenant(tenant: Tenant): Tenant {
  const normalized = {
    ...tenantDefaults,
    ...tenant,
    theme: { ...tenantDefaults.theme, ...tenant.theme },
    map: { ...tenantDefaults.map, ...tenant.map },
    contact: { ...tenantDefaults.contact, ...tenant.contact },
    legal: { ...tenantDefaults.legal, ...tenant.legal },
    tracking: { ...tenantDefaults.tracking, ...tenant.tracking },
    email: { ...tenantDefaults.email, ...tenant.email },
    billing: { ...tenantDefaults.billing, ...tenant.billing },
    integrations: {
      mail: normalizeMailIntegration(tenant.integrations?.mail),
      captcha: { ...tenantDefaults.integrations.captcha, ...tenant.integrations?.captcha },
      storage: { ...tenantDefaults.integrations.storage, ...tenant.integrations?.storage },
      database: { ...tenantDefaults.integrations.database, ...tenant.integrations?.database },
      backup: { ...tenantDefaults.integrations.backup, ...tenant.integrations?.backup }
    },
    features: { ...tenantDefaults.features, ...tenant.features },
    categories: tenant.categories ?? tenantDefaults.categories,
    stations: tenant.stations ?? [],
    media: tenant.media ?? [],
    events: tenant.events ?? [],
    tours: tenant.tours ?? [],
    rewards: tenant.rewards ?? [],
    guestGuide: tenant.guestGuide ?? [],
    feedback: tenant.feedback ?? [],
    auditLog: tenant.auditLog ?? [],
    users: tenant.users ?? [],
    privacyRequests: tenant.privacyRequests ?? []
  };
  return applyBillingPlan(normalized, normalized.billing.plan);
}

function normalizeMailIntegration(mail: Partial<Tenant["integrations"]["mail"]> | Record<string, unknown> | undefined): Tenant["integrations"]["mail"] {
  void mail;
  return {
    provider: "global-smtp"
  };
}

function audit(tenantId: string, actorEmail: string, action: string, entityType: string, entityId: string): AuditEntry {
  return { id: crypto.randomUUID(), tenantId, actorEmail, action, entityType, entityId, createdAt: new Date().toISOString() };
}

export async function listTenants(): Promise<Tenant[]> {
  if (!process.env.DATABASE_URL) {
    if (!allowsLocalDataFallback()) throw new Error("DATABASE_URL fehlt. Platzguide benötigt in Produktion PostgreSQL.");
    return readLocalTenants();
  }
  try {
    if (process.env.NODE_ENV !== "production") {
      if (!await canReachDatabase(process.env.DATABASE_URL, 800)) {
        throw new Error("PostgreSQL not reachable");
      }
    }
    return await readPostgresTenants();
  } catch (error) {
    if (!allowsLocalDataFallback()) throw error;
    console.warn("PostgreSQL nicht erreichbar, nutze lokale Entwicklungsdaten.");
    return readLocalTenants();
  }
}

function allowsLocalDataFallback() {
  return process.env.ALLOW_LOCAL_DATA_FALLBACK === "true"
    || process.env.NODE_ENV !== "production"
    || process.env.NEXT_PHASE === "phase-production-build";
}

async function canReachDatabase(databaseUrl: string, timeoutMs: number) {
  const parsed = new URL(databaseUrl);
  const port = Number(parsed.port || 5432);
  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host: parsed.hostname, port });
    const done = (result: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

export async function saveTenantConfiguration(tenantId: string, tenant: Tenant, actorEmail: string) {
  if (tenant.id !== tenantId) throw new Error("Cross-tenant configuration write rejected");
  const normalized = normalizeTenant(tenant);
  if (process.env.DATABASE_URL) {
    const sql = postgres(process.env.DATABASE_URL, { connect_timeout: 3, idle_timeout: 5, max: 1 });
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
  const auditEntry = audit(tenantId, actorEmail, "update", "tenant", tenantId);
  tenants[index] = normalizeTenant({
    ...normalized,
    auditLog: [auditEntry, ...(normalized.auditLog ?? [])].slice(0, 100)
  });
  await writeLocalTenants(tenants);
  return tenants[index];
}

export async function archiveTenant(tenantId: string, actorEmail: string) {
  const tenant = (await listTenants()).find((candidate) => candidate.id === tenantId);
  if (!tenant) throw new Error("Tenant not found");
  return saveTenantConfiguration(tenantId, {
    ...tenant,
    archivedAt: new Date().toISOString(),
    billing: {
      ...tenant.billing,
      status: "blocked",
      publicEnabled: false
    },
    auditLog: [audit(tenantId, actorEmail, "archive", "tenant", tenantId), ...tenant.auditLog].slice(0, 100)
  }, actorEmail);
}

export async function reactivateTenant(tenantId: string, actorEmail: string) {
  const tenant = (await listTenants()).find((candidate) => candidate.id === tenantId);
  if (!tenant) throw new Error("Tenant not found");
  const { archivedAt: _archivedAt, ...rest } = tenant;
  void _archivedAt;
  return saveTenantConfiguration(tenantId, {
    ...rest,
    billing: {
      ...tenant.billing,
      status: "trial",
      publicEnabled: false
    },
    auditLog: [audit(tenantId, actorEmail, "reactivate", "tenant", tenantId), ...tenant.auditLog].slice(0, 100)
  }, actorEmail);
}

export async function deleteTenantPermanently(tenantId: string, actorEmail: string) {
  if (process.env.DATABASE_URL) {
    const sql = postgres(process.env.DATABASE_URL, { connect_timeout: 3, idle_timeout: 5, max: 1 });
    try {
      await sql.begin(async (transaction) => {
        await transaction`SELECT set_config('app.platform_admin', 'true', true)`;
        await transaction`
          INSERT INTO audit_log (tenant_id, actor_email, action, entity_type, entity_id)
          VALUES (${tenantId}, ${actorEmail}, 'delete-permanent', 'tenant', ${tenantId})
        `;
        await transaction`DELETE FROM tenants WHERE id = ${tenantId}`;
      });
    } finally {
      await sql.end();
    }
    return;
  }

  const tenants = await readLocalTenants();
  const nextTenants = tenants.filter((candidate) => candidate.id !== tenantId);
  if (nextTenants.length === tenants.length) throw new Error("Tenant not found");
  await writeLocalTenants(nextTenants);
}

export async function createTenantInstance(input: {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerPasswordHash?: string;
  actorEmail?: string;
  emailVerified?: boolean;
  sendVerificationEmail?: boolean;
}) {
  const slug = input.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (slug.length < 2) throw new Error("Invalid slug");
  const tenants = await listTenants();
  if (tenants.some((tenant) => tenant.slug === slug)) {
    throw new Error("Slug already exists");
  }

  const shouldSendVerificationEmail = input.sendVerificationEmail !== false;
  const verificationToken = crypto.randomUUID();
  const tenantId = crypto.randomUUID();
  const tenant: Tenant = normalizeTenant({
    ...structuredClone(tenantDefaults),
    id: tenantId,
    slug,
    hosts: [],
    name: input.name,
    tagline: "Mein digitaler Platzguide.",
    logoMark: input.name.trim().charAt(0).toUpperCase() || "C",
    contact: { phone: "", email: input.ownerEmail, emergency: "112" },
    map: {
      center: [10.5605, 49.1643],
      zoom: 15,
      styleUrl: "https://tiles.openfreemap.org/styles/liberty",
      configured: false,
      bounds: undefined
    },
    stations: createDefaultStationTemplates(tenantId),
    media: [],
    events: [],
    tours: [],
    rewards: [],
    guestGuide: [],
    feedback: [],
    users: [{
      id: crypto.randomUUID(),
      tenantId: "",
      email: input.ownerEmail.toLowerCase(),
      role: "tenant-owner",
      passwordHash: input.ownerPasswordHash,
      emailVerifiedAt: input.emailVerified ? new Date().toISOString() : undefined,
      emailVerificationToken: input.emailVerified ? undefined : verificationToken,
      emailVerificationExpiresAt: input.emailVerified ? undefined : new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      createdAt: new Date().toISOString()
    }],
    privacyRequests: [],
    auditLog: [{
      id: crypto.randomUUID(),
      tenantId: "",
      actorEmail: input.actorEmail ?? input.ownerEmail,
      action: "create",
      entityType: "tenant",
      entityId: "",
      createdAt: new Date().toISOString()
    }]
  });
  tenant.auditLog[0] = { ...tenant.auditLog[0], tenantId: tenant.id, entityId: tenant.id };
  tenant.users = tenant.users.map((user) => ({ ...user, tenantId: tenant.id }));

  if (process.env.DATABASE_URL) {
    const sql = postgres(process.env.DATABASE_URL, { connect_timeout: 3, idle_timeout: 5, max: 1 });
    try {
      await sql.begin(async (transaction) => {
        await transaction`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;
        await transaction`
          INSERT INTO tenants (id, slug, name, hosts, configuration)
          VALUES (${tenant.id}, ${tenant.slug}, ${tenant.name}, ${tenant.hosts}, ${transaction.json(tenant)})
        `;
      });
    } finally {
      await sql.end();
    }
    if (shouldSendVerificationEmail) await sendTenantVerificationMail(tenant, input.ownerEmail, verificationToken);
    return tenant;
  }

  const localTenants = await readLocalTenants();
  localTenants.push(tenant);
  await writeLocalTenants(localTenants);
  if (shouldSendVerificationEmail) await sendTenantVerificationMail(tenant, input.ownerEmail, verificationToken);
  return tenant;
}

export async function verifyTenantUserEmail(token: string) {
  const tenants = await listTenants();
  for (const tenant of tenants) {
    const user = tenant.users.find((candidate) => candidate.emailVerificationToken === token);
    if (!user) continue;
    if (!user.emailVerificationExpiresAt || new Date(user.emailVerificationExpiresAt).getTime() < Date.now()) {
      throw new Error("Verification token expired");
    }
    user.emailVerifiedAt = new Date().toISOString();
    delete user.emailVerificationToken;
    delete user.emailVerificationExpiresAt;
    tenant.auditLog = [audit(tenant.id, user.email, "verify-email", "tenant-user", user.id), ...tenant.auditLog].slice(0, 100);
    await saveTenantConfiguration(tenant.id, tenant, user.email);
    await sendTenantWelcomeMail(tenant, user.email);
    return { tenant, user };
  }
  throw new Error("Verification token not found");
}

export async function requestTenantPasswordReset(email: string) {
  const normalizedEmail = email.toLowerCase();
  const tenants = await listTenants();
  for (const tenant of tenants) {
    const user = tenant.users.find((candidate) => candidate.email.toLowerCase() === normalizedEmail);
    if (!user) continue;
    const token = crypto.randomUUID();
    user.passwordResetToken = token;
    user.passwordResetExpiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();
    tenant.auditLog = [audit(tenant.id, user.email, "password-reset-request", "tenant-user", user.id), ...tenant.auditLog].slice(0, 100);
    await saveTenantConfiguration(tenant.id, tenant, user.email);
    await sendTenantPasswordResetMail(tenant, user.email, token);
    return true;
  }
  return false;
}

export async function resetTenantUserPassword(token: string, passwordHash: string) {
  const tenants = await listTenants();
  for (const tenant of tenants) {
    const user = tenant.users.find((candidate) => candidate.passwordResetToken === token);
    if (!user) continue;
    if (!user.passwordResetExpiresAt || new Date(user.passwordResetExpiresAt).getTime() < Date.now()) {
      throw new Error("Password reset token expired");
    }
    user.passwordHash = passwordHash;
    delete user.passwordResetToken;
    delete user.passwordResetExpiresAt;
    tenant.auditLog = [audit(tenant.id, user.email, "password-reset", "tenant-user", user.id), ...tenant.auditLog].slice(0, 100);
    await saveTenantConfiguration(tenant.id, tenant, user.email);
    await sendTenantPasswordChangedMail(tenant, user.email);
    return { tenant, user };
  }
  throw new Error("Password reset token not found");
}

async function sendTenantVerificationMail(tenant: Tenant, email: string, token: string) {
  const verifyUrl = appUrl(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
  await sendMail({
    to: email,
    subject: `Platzguide bestätigen · ${tenant.name}`,
    eyebrow: "Registrierung",
    title: "Bestätige deine E-Mail-Adresse.",
    intro: `Dein Platzguide für ${tenant.name} wurde vorbereitet.\n\nBitte bestätige jetzt deine E-Mail-Adresse. Danach kannst du deinen Campingplatz im Adminbereich einrichten.`,
    text: `Dein Platzguide für ${tenant.name} wurde vorbereitet.\n\nBitte bestätige deine E-Mail-Adresse: ${verifyUrl}`,
    actionLabel: "E-Mail bestätigen",
    actionUrl: verifyUrl,
    rows: [
      { label: "Campingplatz", value: tenant.name },
      { label: "Platzguide-Link", value: tenantPublicUrl(tenant.slug) },
      { label: "Adminbereich", value: tenantAdminUrl(tenant.slug) }
    ],
    footerNote: "Wenn du diese Registrierung nicht gestartet hast, kannst du diese E-Mail ignorieren."
  });
}

async function sendTenantWelcomeMail(tenant: Tenant, email: string) {
  await sendMail({
    to: email,
    subject: `Willkommen bei Platzguide · ${tenant.name}`,
    eyebrow: "Bereit",
    title: "Dein Zugang ist bestätigt.",
    intro: `Willkommen bei Platzguide.\n\nDu kannst jetzt Branding, Kartengrundlagen, Stationen, Rechtstexte und Veröffentlichung für ${tenant.name} pflegen.`,
    text: `Dein Zugang ist bestätigt.\n\nAdminbereich: ${tenantAdminUrl(tenant.slug)}\nBesucheransicht: ${tenantPublicUrl(tenant.slug)}`,
    actionLabel: "Adminbereich öffnen",
    actionUrl: tenantAdminUrl(tenant.slug),
    rows: [
      { label: "Campingplatz", value: tenant.name },
      { label: "Besucheransicht", value: tenantPublicUrl(tenant.slug) }
    ]
  });
}

async function sendTenantPasswordResetMail(tenant: Tenant, email: string, token: string) {
  const resetUrl = appUrl(`/admin/login?reset=${encodeURIComponent(token)}`);
  await sendMail({
    to: email,
    subject: `Passwort zurücksetzen · ${tenant.name}`,
    eyebrow: "Sicherheit",
    title: "Setze dein Passwort zurück.",
    intro: `Für deinen Platzguide-Zugang wurde ein neues Passwort angefordert.\n\nDer Link ist 60 Minuten gültig. Wenn du das nicht warst, ignoriere diese E-Mail einfach.`,
    text: `Passwort zurücksetzen: ${resetUrl}\n\nDer Link ist 60 Minuten gültig.`,
    actionLabel: "Passwort neu setzen",
    actionUrl: resetUrl,
    rows: [
      { label: "Campingplatz", value: tenant.name },
      { label: "Adminbereich", value: tenantAdminUrl(tenant.slug) }
    ],
    footerNote: "Aus Sicherheitsgründen läuft dieser Link nach 60 Minuten ab."
  });
}

async function sendTenantPasswordChangedMail(tenant: Tenant, email: string) {
  await sendMail({
    to: email,
    subject: `Passwort geändert · ${tenant.name}`,
    eyebrow: "Sicherheit",
    title: "Dein Passwort wurde geändert.",
    intro: `Das Passwort für deinen Platzguide-Zugang wurde erfolgreich geändert.\n\nWenn du das nicht warst, melde dich bitte sofort beim Plattformbetreiber.`,
    text: `Das Passwort für ${tenant.name} wurde geändert.\n\nAdminbereich: ${tenantAdminUrl(tenant.slug)}`,
    actionLabel: "Zum Adminbereich",
    actionUrl: tenantAdminUrl(tenant.slug),
    rows: [{ label: "Campingplatz", value: tenant.name }]
  });
}

export async function saveStation(tenantId: string, station: Station, actorEmail: string) {
  if (station.tenantId !== tenantId) throw new Error("Cross-tenant write rejected");
  if (process.env.DATABASE_URL) {
    const sql = postgres(process.env.DATABASE_URL, { connect_timeout: 3, idle_timeout: 5, max: 1 });
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
    const sql = postgres(process.env.DATABASE_URL, { connect_timeout: 3, idle_timeout: 5, max: 1 });
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

export async function findTenantUser(email: string) {
  const normalizedEmail = email.toLowerCase();
  const tenants = await listTenants();
  for (const tenant of tenants) {
    const user = tenant.users.find((candidate) => candidate.email.toLowerCase() === normalizedEmail);
    if (user) return { tenant, user };
  }
  return null;
}

export async function createPrivacyRequest(tenantId: string, email: string, type: PrivacyRequest["type"]) {
  const request: PrivacyRequest = {
    id: crypto.randomUUID(),
    tenantId,
    email: email.toLowerCase(),
    type,
    status: "new",
    createdAt: new Date().toISOString()
  };
  if (process.env.DATABASE_URL) {
    const tenant = (await listTenants()).find((candidate) => candidate.id === tenantId);
    if (!tenant) throw new Error("Tenant not found");
    return saveTenantConfiguration(tenantId, {
      ...tenant,
      privacyRequests: [request, ...tenant.privacyRequests].slice(0, 250),
      auditLog: [audit(tenantId, email, `privacy:${type}`, "privacy-request", request.id), ...tenant.auditLog].slice(0, 100)
    }, email).then(() => request);
  }
  const tenants = await readLocalTenants();
  const tenant = tenants.find((candidate) => candidate.id === tenantId);
  if (!tenant) throw new Error("Tenant not found");
  tenant.privacyRequests = [request, ...tenant.privacyRequests].slice(0, 250);
  tenant.auditLog = [audit(tenantId, email, `privacy:${type}`, "privacy-request", request.id), ...tenant.auditLog].slice(0, 100);
  await writeLocalTenants(tenants);
  return request;
}

export async function exportTenantData(tenantId: string) {
  const tenant = (await listTenants()).find((candidate) => candidate.id === tenantId);
  if (!tenant) throw new Error("Tenant not found");
  return {
    exportedAt: new Date().toISOString(),
    tenant: {
      ...tenant,
      users: tenant.users.map((user) => ({
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role,
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt
      }))
    }
  };
}

export async function markTenantForDeletion(tenantId: string, actorEmail: string) {
  if (process.env.DATABASE_URL) {
    const tenant = (await listTenants()).find((candidate) => candidate.id === tenantId);
    if (!tenant) throw new Error("Tenant not found");
    const request: PrivacyRequest = {
      id: crypto.randomUUID(),
      tenantId,
      email: actorEmail.toLowerCase(),
      type: "delete",
      status: "new",
      createdAt: new Date().toISOString()
    };
    await saveTenantConfiguration(tenantId, {
      ...tenant,
      privacyRequests: [request, ...tenant.privacyRequests].slice(0, 250),
      auditLog: [audit(tenantId, actorEmail, "delete-request", "tenant", tenantId), ...tenant.auditLog].slice(0, 100)
    }, actorEmail);
    return request;
  }
  const tenants = await readLocalTenants();
  const tenant = tenants.find((candidate) => candidate.id === tenantId);
  if (!tenant) throw new Error("Tenant not found");
  const request: PrivacyRequest = {
    id: crypto.randomUUID(),
    tenantId,
    email: actorEmail.toLowerCase(),
    type: "delete",
    status: "new",
    createdAt: new Date().toISOString()
  };
  tenant.privacyRequests = [request, ...tenant.privacyRequests].slice(0, 250);
  tenant.auditLog = [audit(tenantId, actorEmail, "delete-request", "tenant", tenantId), ...tenant.auditLog].slice(0, 100);
  await writeLocalTenants(tenants);
  return request;
}
