import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { readPlatformConfig, writePlatformConfig } from "@/lib/platform-config-store";
import { tenantDefaults } from "@/lib/tenant-defaults";
import type { Tenant } from "@/lib/types";

export type ModuleId = keyof typeof tenantDefaults.features;

export const moduleCatalog: { id: ModuleId; label: string; description: string }[] = [
  { id: "events", label: "Veranstaltungen", description: "Termine und Aktionen in der Besucher-App." },
  { id: "tours", label: "Rundgänge", description: "Geführte Wege über mehrere Stationen." },
  { id: "checkins", label: "Check-ins", description: "Lokale Check-ins an Stationen." },
  { id: "rewards", label: "Platzguide-Pass", description: "Belohnungen anhand gesammelter Check-ins." },
  { id: "guestGuide", label: "Digitale Gästemappe", description: "Infos wie WLAN, Regeln, Anreise und Services." },
  { id: "feedback", label: "Feedback", description: "Besuchermeldungen und Fehlermeldungen." },
  { id: "push", label: "Mitteilungen", description: "Aktive Hinweise in der Besucher-App." },
  { id: "occupancy", label: "Statusanzeigen", description: "Manuelle Ampeln für Bereiche oder Services." }
];

export type PlatformSettings = {
  availableFeatures: Record<ModuleId, boolean>;
  defaultFeatures: Record<ModuleId, boolean>;
  tenantAdminPermissions: {
    integrations: boolean;
    analytics: boolean;
    storage: boolean;
    backup: boolean;
  };
  defaultIntegrations: Tenant["integrations"];
  defaultTracking: Tenant["tracking"];
};

const dataDirectory = process.env.PLATZGUIDE_DATA_DIR ?? path.join(process.cwd(), ".data");
const settingsFile = path.join(dataDirectory, "platform-settings.json");

export const platformSettingsDefaults: PlatformSettings = {
  availableFeatures: Object.fromEntries(moduleCatalog.map((module) => [module.id, true])) as Record<ModuleId, boolean>,
  defaultFeatures: { ...tenantDefaults.features },
  tenantAdminPermissions: {
    integrations: false,
    analytics: false,
    storage: false,
    backup: false
  },
  defaultIntegrations: tenantDefaults.integrations,
  defaultTracking: tenantDefaults.tracking
};

export async function readPlatformSettings(): Promise<PlatformSettings> {
  const databaseSettings = await readPlatformConfig<PlatformSettings>("platform-settings");
  if (databaseSettings) return normalizePlatformSettings(databaseSettings);
  try {
    return normalizePlatformSettings(JSON.parse(await readFile(settingsFile, "utf8")));
  } catch {
    return platformSettingsDefaults;
  }
}

export async function writePlatformSettings(settings: PlatformSettings) {
  const normalized = normalizePlatformSettings(settings);
  const databaseSettings = await writePlatformConfig("platform-settings", normalized);
  if (databaseSettings) return normalized;
  await mkdir(dataDirectory, { recursive: true });
  const temporaryFile = `${settingsFile}.tmp`;
  await writeFile(temporaryFile, JSON.stringify(normalized, null, 2));
  await rename(temporaryFile, settingsFile);
  return normalized;
}

export async function applyPlatformSettingsToTenant(tenant: Tenant): Promise<Tenant> {
  const settings = await readPlatformSettings();
  const features = Object.fromEntries(moduleCatalog.map((module) => [
    module.id,
    Boolean(settings.availableFeatures[module.id] && settings.defaultFeatures[module.id])
  ])) as Record<ModuleId, boolean>;
  return {
    ...tenant,
    features,
    tracking: { ...settings.defaultTracking },
    integrations: {
      mail: { provider: "global-smtp" },
      captcha: { ...settings.defaultIntegrations.captcha },
      storage: { ...settings.defaultIntegrations.storage },
      database: { ...settings.defaultIntegrations.database },
      backup: { ...settings.defaultIntegrations.backup }
    }
  };
}

function normalizePlatformSettings(settings: Partial<PlatformSettings>): PlatformSettings {
  return {
    availableFeatures: { ...platformSettingsDefaults.availableFeatures, ...settings.availableFeatures },
    defaultFeatures: { ...platformSettingsDefaults.defaultFeatures, ...settings.defaultFeatures },
    tenantAdminPermissions: { ...platformSettingsDefaults.tenantAdminPermissions, ...settings.tenantAdminPermissions },
    defaultIntegrations: {
      mail: { provider: "global-smtp" },
      captcha: { ...platformSettingsDefaults.defaultIntegrations.captcha, ...settings.defaultIntegrations?.captcha },
      storage: { ...platformSettingsDefaults.defaultIntegrations.storage, ...settings.defaultIntegrations?.storage },
      database: { ...platformSettingsDefaults.defaultIntegrations.database, ...settings.defaultIntegrations?.database },
      backup: { ...platformSettingsDefaults.defaultIntegrations.backup, ...settings.defaultIntegrations?.backup }
    },
    defaultTracking: { ...platformSettingsDefaults.defaultTracking, ...settings.defaultTracking }
  };
}
