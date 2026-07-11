"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Activity, Bell, BookOpen, CalendarDays, Caravan, CheckCircle2, ChevronRight, CreditCard, Database, Download, FileText, Gift, Globe2, HelpCircle, ImageIcon, LayoutDashboard, LifeBuoy, Mail, MapPinned, Menu, MessageSquareWarning, Palette, Plus, Search, Server, Settings, ShieldCheck, Trash2, Users, X } from "lucide-react";
import { applyBillingPlan, billingPlans, formatEuro, storageUsedMb } from "@/lib/billing";
import type { AuditEntry, Category, EventItem, GuestGuideItem, MediaAsset, Reward, Station, Tenant, Tour } from "@/lib/types";
import { cn, statusLabel } from "@/lib/utils";
import { StationLocationPicker } from "@/components/station-location-picker";
import { StationImport } from "@/components/station-import";
import { CreateTenantForm } from "@/components/platform-admin-console";
import { CampAreaPicker } from "@/components/camp-area-picker";

const platformLogo = "/icons/platzguide-logo.png";
type PlatformAuditEntry = AuditEntry & { tenantName: string; tenantSlug?: string };

const navigation = [
  { id: "overview", label: "Übersicht", icon: LayoutDashboard },
  { id: "tenants", label: "Campingplätze", icon: Caravan },
  { id: "stations", label: "Stationen", icon: MapPinned },
  { id: "categories", label: "Kategorien", icon: Settings },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "media", label: "Medien", icon: ImageIcon },
  { id: "events", label: "Veranstaltungen", icon: CalendarDays },
  { id: "tours", label: "Rundgänge", icon: MapPinned },
  { id: "rewards", label: "Platzguide-Pass", icon: Gift },
  { id: "guide", label: "Gästemappe", icon: BookOpen },
  { id: "feedback", label: "Feedback", icon: MessageSquareWarning },
  { id: "legal", label: "Recht & Datenschutz", icon: FileText },
  { id: "modules", label: "Module", icon: Settings },
  { id: "integrations", label: "Integrationen", icon: Settings },
  { id: "billing", label: "Abo & Veröffentlichung", icon: ShieldCheck },
  { id: "security", label: "Sicherheit", icon: ShieldCheck },
  { id: "profile", label: "Profil", icon: Users }
];

export function AdminConsole({ tenant, tenants, adminEmail }: { tenant: Tenant; tenants: Tenant[]; adminEmail: string }) {
  const [section, setSection] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [availableTenants, setAvailableTenants] = useState(tenants);
  const [currentTenant, setCurrentTenant] = useState(tenant);
  const [stations, setStations] = useState(tenant.stations);
  const [editing, setEditing] = useState<Station | null>(null);
  const [saving, setSaving] = useState(false);
  const isPlatformAdmin = adminEmail.toLowerCase() === "admin@schellenberger.biz";
  const tenantAdminHiddenSections = new Set(["modules", "billing", "security"]);
  const visibleNavigation = isPlatformAdmin
    ? [{ id: "platform", label: "Plattform", icon: Server }, ...navigation]
    : navigation.filter((item) => !tenantAdminHiddenSections.has(item.id));

  async function removeStation(id: string) {
    if (!confirm("Station wirklich löschen?")) return;
    const response = await fetch(`/api/admin/stations?id=${encodeURIComponent(id)}&tenantId=${encodeURIComponent(currentTenant.id)}`, { method: "DELETE" });
    if (!response.ok) return alert("Die Station konnte nicht gelöscht werden.");
    setStations((items) => items.filter((item) => item.id !== id));
  }

  async function persistStation(station: Station) {
    const response = await fetch("/api/admin/stations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(station)
    });
    if (!response.ok) return alert("Die Station konnte nicht gespeichert werden.");
    const saved = await response.json() as Station;
    setStations((items) => items.some((item) => item.id === saved.id)
      ? items.map((item) => item.id === saved.id ? saved : item)
      : [saved, ...items]);
    setEditing(null);
  }

  async function saveTenant(nextTenant: Tenant) {
    setSaving(true);
    const response = await fetch("/api/admin/tenant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...nextTenant, stations })
    });
    setSaving(false);
    if (!response.ok) {
      alert("Die Einstellungen konnten nicht gespeichert werden.");
      return;
    }
    const saved = await response.json() as Tenant;
    setCurrentTenant(saved);
    setStations(saved.stations);
    setAvailableTenants((items) => items.map((item) => item.id === saved.id ? saved : item));
  }

  async function updateTenantLifecycle(action: "archive" | "reactivate" | "delete") {
    const confirmation = action === "delete"
      ? `Mandant "${currentTenant.name}" endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
      : action === "archive"
        ? `Mandant "${currentTenant.name}" archivieren und öffentlich sperren?`
        : `Mandant "${currentTenant.name}" reaktivieren? Die Besucher-App bleibt bis zur Freigabe weiterhin geschlossen.`;
    if (!confirm(confirmation)) return;
    setSaving(true);
    const response = await fetch("/api/admin/tenant/lifecycle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: currentTenant.id, action })
    });
    setSaving(false);
    if (!response.ok) {
      alert("Die Mandantenaktion konnte nicht ausgeführt werden.");
      return;
    }
    if (action === "delete") {
      const remainingTenants = availableTenants.filter((item) => item.id !== currentTenant.id);
      setAvailableTenants(remainingTenants);
      const nextTenant = remainingTenants[0];
      if (!nextTenant) {
        window.location.reload();
        return;
      }
      setCurrentTenant(nextTenant);
      setStations(nextTenant.stations);
      setEditing(null);
      return;
    }
    const payload = await response.json() as { tenant: Tenant };
    setCurrentTenant(payload.tenant);
    setStations(payload.tenant.stations);
    setAvailableTenants((items) => items.map((item) => item.id === payload.tenant.id ? payload.tenant : item));
  }

  async function importStations(importedStations: Station[]) {
    for (const station of importedStations) await persistStation(station);
  }

  return <div className="min-h-screen overflow-x-hidden bg-[#f2f3ef] text-[#1b302a]">
    {menuOpen && <button aria-label="Menü schließen" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-20 bg-black/35 lg:hidden" />}
    <aside className={cn("fixed inset-y-0 left-0 z-30 flex w-60 flex-col overflow-y-auto overflow-x-hidden bg-[#173c32] p-4 text-white transition-transform lg:translate-x-0", menuOpen ? "translate-x-0" : "-translate-x-full")}>
      <div className="flex items-center justify-between"><a href="https://platzguide.de" className="flex min-w-0 items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl bg-white/95 p-1.5 shadow-sm"><Image src={platformLogo} alt="Platzguide" width={40} height={40} className="h-full w-full object-contain" priority /></span><div className="min-w-0"><p className="font-display text-xl">Platzguide</p><p className="text-[10px] uppercase tracking-widest text-white/45">Plattform Admin</p></div></a><button className="lg:hidden" onClick={() => setMenuOpen(false)}><X /></button></div>
      <nav className="mt-6 space-y-1">{visibleNavigation.map((item) => <button key={item.id} onClick={() => { setSection(item.id); setMenuOpen(false); }} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold transition", section === item.id ? "bg-white text-[#173c32]" : "text-white/65 hover:bg-white/10 hover:text-white")}><item.icon size={18} />{item.label}</button>)}</nav>
      <div className="mt-auto shrink-0 rounded-xl bg-white/5 p-3"><p className="truncate text-xs font-bold">{adminEmail}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-white/35">Plattform-Administrator</p><form action="/api/auth/logout" method="post"><button className="mt-3 text-xs text-[#e8b65f]">Sicher abmelden</button></form></div>
    </aside>

    <main className="min-w-0 overflow-x-hidden lg:ml-60">
      <header className="sticky top-0 z-20 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-[#f2f3ef]/90 px-[5%] py-2 backdrop-blur-xl">
        <button aria-label="Menü öffnen" className="shrink-0 lg:hidden" onClick={() => setMenuOpen(true)}><Menu /></button><div className="hidden min-w-0 sm:block"><p className="text-xs font-bold uppercase tracking-widest text-[#1b302a]/40">Plattformverwaltung</p><h1 className="truncate font-display text-2xl">{visibleNavigation.find((item) => item.id === section)?.label}</h1></div><div className="flex min-w-0 flex-1 justify-end gap-2"><select title="Wähle aus, welchen Campingplatz du gerade ansehen oder bearbeiten möchtest." aria-label="Mandant wählen" value={currentTenant.id} onChange={(event) => { const nextTenant = availableTenants.find((item) => item.id === event.target.value); if (!nextTenant) return; setCurrentTenant(nextTenant); setStations(nextTenant.stations); setEditing(null); }} className="min-w-0 max-w-[46vw] rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-bold"><option value="" disabled>Mandant wählen</option>{availableTenants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><a href={`/c/${currentTenant.slug}`} target="_blank" className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-bold"><Globe2 size={16} className="sm:mr-2 sm:inline" /><span className="hidden sm:inline">Besucheransicht</span></a><button aria-label="Benachrichtigungen" className="rounded-xl border border-black/10 bg-white p-2.5"><Bell size={18} /></button></div>
      </header>
      <div className="mx-auto min-w-0 w-[90%] py-5">
        {section === "platform" && <PlatformSection tenants={availableTenants} adminEmail={adminEmail} />}
        {section === "overview" && <Overview key={currentTenant.id} tenant={currentTenant} stations={stations} stationCount={stations.filter((station) => !station.isTemplate).length} templateCount={stations.filter((station) => station.isTemplate).length} onNavigate={setSection} />}
        {section === "stations" && <Stations key={currentTenant.id} tenant={currentTenant} stations={stations} onEdit={setEditing} onRemove={removeStation} onCreate={() => setEditing(blankStation(currentTenant.id))} onImport={importStations} />}
        {section === "categories" && <Categories key={currentTenant.id} tenant={currentTenant} saving={saving} onSave={saveTenant} />}
        {section === "tenants" && <TenantSettings key={currentTenant.id} tenant={currentTenant} saving={saving} platformAdmin={adminEmail.toLowerCase() === "admin@schellenberger.biz"} onLifecycle={updateTenantLifecycle} onSave={saveTenant} />}
        {section === "branding" && <Branding key={currentTenant.id} tenant={currentTenant} saving={saving} onSave={saveTenant} />}
        {section === "legal" && <Legal key={currentTenant.id} tenant={currentTenant} saving={saving} onSave={saveTenant} />}
        {section === "modules" && <Modules key={currentTenant.id} tenant={currentTenant} saving={saving} onSave={saveTenant} />}
        {section === "integrations" && <Integrations key={currentTenant.id} tenant={currentTenant} saving={saving} platformAdmin={isPlatformAdmin} onSave={saveTenant} />}
        {section === "billing" && <Billing key={currentTenant.id} tenant={currentTenant} saving={saving} onSave={saveTenant} />}
        {section === "events" && <Events key={currentTenant.id} tenant={currentTenant} saving={saving} onSave={saveTenant} />}
        {section === "tours" && <Tours key={currentTenant.id} tenant={currentTenant} stations={stations} saving={saving} onSave={saveTenant} />}
        {section === "rewards" && <Rewards key={currentTenant.id} tenant={currentTenant} saving={saving} onSave={saveTenant} />}
        {section === "guide" && <GuestGuide key={currentTenant.id} tenant={currentTenant} saving={saving} onSave={saveTenant} />}
        {section === "feedback" && <Feedback key={currentTenant.id} tenant={currentTenant} saving={saving} onSave={saveTenant} />}
        {section === "profile" && <Profile tenant={currentTenant} adminEmail={adminEmail} />}
        {section === "security" && <Security />}
        {section === "media" && <Media tenant={currentTenant} saving={saving} onSave={saveTenant} />}
      </div>
    </main>
    {editing && <StationEditor station={editing} categories={currentTenant.categories} mapConfig={currentTenant.map} onClose={() => setEditing(null)} onSave={persistStation} />}
  </div>;
}

function Overview({ tenant, stations, stationCount, templateCount, onNavigate }: { tenant: Tenant; stations: Station[]; stationCount: number; templateCount: number; onNavigate: (id: string) => void }) {
  return <div className="animate-enter">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-sm text-[#1b302a]/55">Guten Tag, Michael.</p><h2 className="mt-1 font-display text-4xl">Alles im grünen Bereich.</h2></div>
      <p className="flex items-center gap-2 text-sm font-bold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" /> System betriebsbereit</p>
    </div>
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Status" value={billingStatusLabel[tenant.billing.status]} note={tenant.billing.publicEnabled ? "Öffentlich sichtbar" : "Noch nicht öffentlich"} icon={<Caravan />} />
      <Metric label="Stationen" value={String(stationCount)} note={`${templateCount} Vorlagen`} icon={<MapPinned />} />
      <Metric label="Besuche heute" value="—" note="Tracking deaktiviert" icon={<Activity />} />
      <Metric label="Admins" value="1" note="Plattformweit" icon={<Users />} />
    </div>
    <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <SetupAssistant tenant={tenant} stations={stations} onNavigate={onNavigate} />
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between"><h3 className="font-display text-2xl">Dein Campingplatz</h3><button onClick={() => onNavigate("tenants")} className="text-sm font-bold text-[#286551]">Verwalten <ChevronRight size={16} className="inline" /></button></div>
        <div className="mt-5 flex items-center gap-4 rounded-2xl bg-[#eff3ec] p-4"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-white p-1.5 shadow-sm"><Image src={platformLogo} alt="Platzguide" width={44} height={44} className="h-full w-full object-contain" /></span><div className="min-w-0"><p className="truncate font-bold">{tenant.name}</p><p className="truncate text-sm text-[#1b302a]/50">/c/{tenant.slug}</p></div><BillingBadge tenant={tenant} /></div>
      </section>
    </div>
  </div>;
}

function PlatformSection({ tenants, adminEmail }: { tenants: Tenant[]; adminEmail: string }) {
  const auditEntries: PlatformAuditEntry[] = tenants.flatMap((tenant) => tenant.auditLog.map((entry) => ({ ...entry, tenantName: tenant.name }))).slice(0, 20);
  const archivedCount = tenants.filter((tenant) => tenant.archivedAt).length;
  const publicCount = tenants.filter((tenant) => tenant.billing.publicEnabled && tenant.billing.status === "active").length;
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [auditLines, setAuditLines] = useState(auditEntries);
  const [cleanup, setCleanup] = useState<{ candidates: { url: string; sizeBytes: number }[]; reclaimableBytes: number; dryRun: boolean; deleted: number } | null>(null);
  const [systemMessage, setSystemMessage] = useState("");

  const loadSystemLogs = useCallback(async () => {
    const response = await fetch("/api/admin/system/logs?lines=80");
    const payload = await response.json() as { lines?: string[]; warning?: string };
    setSystemLogs(payload.lines ?? []);
    if (payload.warning) setSystemMessage(payload.warning);
  }, []);

  const loadAudit = useCallback(async () => {
    const response = await fetch("/api/admin/system/audit");
    if (!response.ok) return;
    const payload = await response.json() as { entries: PlatformAuditEntry[] };
    setAuditLines(payload.entries);
  }, []);

  const previewCleanup = useCallback(async () => {
    const response = await fetch("/api/admin/system/cleanup");
    if (!response.ok) return;
    setCleanup(await response.json());
  }, []);

  async function runCleanup() {
    if (!cleanup?.candidates.length) return;
    if (!confirm(`${cleanup.candidates.length} ungenutzte Upload-Dateien endgültig löschen?`)) return;
    const response = await fetch("/api/admin/system/cleanup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dryRun: false })
    });
    if (!response.ok) return alert("Upload-Cleanup konnte nicht ausgeführt werden.");
    const payload = await response.json();
    setCleanup(payload);
    setSystemMessage(`${payload.deleted} Upload-Dateien gelöscht.`);
  }

  async function checkMonitoring() {
    const response = await fetch("/api/admin/system/monitoring");
    const payload = await response.json().catch(() => null) as { ok?: boolean; error?: string; latencyMs?: number } | null;
    setSystemMessage(payload?.ok ? `Monitoring OK · ${payload.latencyMs ?? "?"} ms` : `Monitoring meldet Fehler: ${payload?.error ?? response.status}`);
  }

  return <div className="animate-enter space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-sm text-[#1b302a]/55">Angemeldet als {adminEmail}</p><h2 className="mt-1 font-display text-4xl">Plattformverwaltung</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">Hier verwaltest du das Projekt selbst: Mandantenstatus, Betriebschecks, globales SMTP, Logs und Auditübersicht.</p></div>
      <a href="/api/health" target="_blank" className="rounded-xl bg-[#173c32] px-4 py-3 text-sm font-bold text-white">Healthcheck öffnen</a>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Mandanten" value={String(tenants.length)} note="Gesamt" icon={<Users />} />
      <Metric label="Öffentlich" value={String(publicCount)} note="Aktive Besucher-Apps" icon={<Globe2 />} />
      <Metric label="Archiviert" value={String(archivedCount)} note="Gesperrt, Daten erhalten" icon={<Database />} />
      <Metric label="System" value="Online" note="Service erreichbar" icon={<Activity />} />
    </div>
    <div className="grid gap-6 xl:grid-cols-2">
      <SettingsCard title="Globale Betriebsinfos" description="Serverweite Einstellungen liegen bewusst nicht als Klartext im Browser.">
        <InfoRow icon={<Mail />} title="SMTP" text="Globale SMTP-Zugangsdaten setzt du ausschließlich in .env.local. Mandanten speichern keine SMTP-Serverdaten." />
        <InfoRow icon={<ShieldCheck />} title="Datenisolierung" text="Alle Mandantendaten sind tenantgebunden. PostgreSQL-RLS wird serverseitig erzwungen." />
        <InfoRow icon={<Server />} title="Updates" text="Updates laufen über scripts/update-ubuntu.sh mit Backup, Migration, Build, Healthcheck und Rollback." />
      </SettingsCard>
      <SettingsCard title="Wichtige Befehle" description="Diese Befehle führst du direkt auf dem Server aus.">
        <Command label="Logs live ansehen" command="journalctl -u platzguide -f" />
        <Command label="Service-Status" command="systemctl status platzguide" />
        <Command label="Update starten" command="sudo RUN_VERIFY=false bash /opt/platzguide/scripts/update-ubuntu.sh" />
        <Command label="Healthcheck lokal" command="curl -fsS http://127.0.0.1:3000/api/health" />
      </SettingsCard>
      <SettingsCard title="Systemlogs" description="Letzte Servermeldungen direkt aus journalctl, falls der Prozess darauf zugreifen darf.">
        <div className="flex flex-wrap gap-2"><button onClick={loadSystemLogs} className="rounded-xl border px-4 py-3 text-sm font-bold">Logs aktualisieren</button><button onClick={checkMonitoring} className="rounded-xl border px-4 py-3 text-sm font-bold">Monitoring prüfen</button></div>
        {systemMessage && <p className="rounded-xl bg-[#f7f7f4] p-3 text-sm font-bold text-[#286551]">{systemMessage}</p>}
        <pre className="max-h-80 overflow-auto rounded-xl bg-[#101f1a] p-3 text-xs leading-5 text-white/80">{systemLogs.length ? systemLogs.join("\n") : "Noch keine Logs geladen."}</pre>
      </SettingsCard>
      <SettingsCard title="Upload-Cleanup" description="Findet Dateien in public/uploads, die in keinem Mandanten mehr referenziert sind.">
        <div className="rounded-xl bg-[#f7f7f4] p-4 text-sm">
          <p><strong>{cleanup?.candidates.length ?? 0}</strong> ungenutzte Dateien · {Math.round((cleanup?.reclaimableBytes ?? 0) / 1024 / 1024 * 10) / 10} MB freigebbar</p>
          <div className="mt-3 flex flex-wrap gap-2"><button onClick={previewCleanup} className="rounded-xl border px-4 py-3 text-sm font-bold">Erneut prüfen</button><button onClick={runCleanup} disabled={!cleanup?.candidates.length} className="rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">Ungenutzte löschen</button></div>
        </div>
        <div className="max-h-44 overflow-auto rounded-xl border border-black/10 p-3 text-xs text-black/55">{cleanup?.candidates.slice(0, 20).map((item) => <p key={item.url} className="break-all">{item.url}</p>) || "Keine Kandidaten."}</div>
      </SettingsCard>
      <SettingsCard title="Mandanten" description="Schneller Überblick über Zahlung, Veröffentlichung und Archivstatus.">
        {tenants.length === 0 && <p className="rounded-xl bg-[#f7f7f4] p-4 text-sm text-black/55">Noch keine Mandanten vorhanden.</p>}
        <div className="space-y-2">{tenants.map((tenant) => <div key={tenant.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 p-3 text-sm">
          <div className="min-w-0"><p className="truncate font-bold">{tenant.name}</p><p className="truncate text-xs text-black/45">/c/{tenant.slug}</p></div>
          <div className="flex flex-wrap gap-2"><BillingBadge tenant={tenant} />{tenant.archivedAt && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Archiviert</span>}</div>
        </div>)}</div>
      </SettingsCard>
      <SettingsCard title="Neuen Campingplatz anlegen" description="Plattform-Admin erstellt Mandanten ohne öffentliche Registrierung.">
        <CreateTenantForm compact />
      </SettingsCard>
      <SettingsCard title="Auditlog" description="Letzte protokollierte Änderungen mandantenübergreifend.">
        <button onClick={loadAudit} className="rounded-xl border px-4 py-3 text-sm font-bold">Auditlog aktualisieren</button>
        {auditLines.length === 0 && <p className="rounded-xl bg-[#f7f7f4] p-4 text-sm text-black/55">Noch keine Audit-Einträge vorhanden.</p>}
        <div className="space-y-2">{auditLines.map((entry) => <div key={`${entry.id}-${entry.createdAt}`} className="rounded-xl border border-black/10 p-3 text-sm">
          <div className="flex flex-wrap justify-between gap-2"><p className="font-bold">{entry.action}</p><p className="text-xs text-black/45">{formatStableDate(entry.createdAt)}</p></div>
          <p className="mt-1 text-xs text-black/55">{entry.tenantName} · {entry.entityType} · {entry.actorEmail}</p>
        </div>)}</div>
      </SettingsCard>
    </div>
  </div>;
}

function InfoRow({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="flex gap-3 rounded-xl border border-black/5 p-3"><span className="mt-0.5 text-[#286551]">{icon}</span><div><p className="font-bold">{title}</p><p className="mt-1 text-sm leading-5 text-black/50">{text}</p></div></div>;
}

function Command({ label, command }: { label: string; command: string }) {
  return <div className="rounded-xl bg-[#173c32] p-3 text-white"><p className="text-xs font-bold uppercase tracking-widest text-white/45">{label}</p><code className="mt-2 block break-all text-sm">{command}</code></div>;
}

function SetupAssistant({ tenant, stations, onNavigate }: { tenant: Tenant; stations: Station[]; onNavigate: (id: string) => void }) {
  const activeStations = stations.filter((station) => !station.isTemplate);
  const steps = [
    { id: "tenants", label: "Kontakt & Link", done: Boolean(tenant.contact.email && tenant.slug) },
    { id: "branding", label: "Logo & Farben", done: Boolean(tenant.name && tenant.theme.primary && tenant.theme.surface) },
    { id: "tenants", label: "Karte oder Platzplan", done: tenant.map.configured !== false },
    { id: "stations", label: "Stationen aktivieren", done: activeStations.length > 0 },
    { id: "legal", label: "Rechtstexte prüfen", done: Boolean(tenant.legal.imprint && tenant.legal.privacy && tenant.legal.cookies) },
    { id: "integrations", label: "Benachrichtigungen prüfen", done: true },
    { id: "billing", label: "Veröffentlichung freigeben", done: tenant.billing.publicEnabled }
  ];
  const doneCount = steps.filter((step) => step.done).length;
  return <section className="rounded-2xl bg-[#173c32] p-5 text-white shadow-sm sm:p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-widest text-[#e8b65f]">Einrichtung</p><h3 className="mt-2 font-display text-3xl">Livegang-Assistent</h3><p className="mt-2 text-sm leading-6 text-white/60">{doneCount} von {steps.length} Punkten erledigt.</p></div>
      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{Math.round(doneCount / steps.length * 100)}%</span>
    </div>
    <div className="mt-5 space-y-2">
      {steps.map((step) => <button key={step.label} onClick={() => onNavigate(step.id)} className="flex w-full items-center justify-between gap-3 rounded-xl bg-white/7 px-3 py-3 text-left text-sm transition hover:bg-white/12">
        <span className="flex min-w-0 items-center gap-3"><CheckCircle2 size={18} className={cn("shrink-0", step.done ? "text-emerald-300" : "text-white/30")} /><span className="truncate font-bold">{step.label}</span></span>
        <ChevronRight size={16} className="shrink-0 text-white/45" />
      </button>)}
    </div>
    <p className="mt-4 rounded-xl bg-white/8 p-3 text-xs leading-5 text-white/60">Vorlagen bleiben für Besucher unsichtbar, bis sie in „Stationen“ aktiviert werden.</p>
  </section>;
}

function Metric({ label, value, note, icon }: { label: string; value: string; note: string; icon: React.ReactNode }) { return <div className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex justify-between text-[#286551]"><p className="text-xs font-bold uppercase tracking-widest text-[#1b302a]/40">{label}</p>{icon}</div><p className="mt-4 font-display text-4xl">{value}</p><p className="mt-1 text-xs text-[#1b302a]/45">{note}</p></div>; }

function Stations({ tenant, stations, onEdit, onRemove, onCreate, onImport }: { tenant: Tenant; stations: Station[]; onEdit: (station: Station) => void; onRemove: (id: string) => void; onCreate: () => void; onImport: (stations: Station[]) => Promise<void> }) {
  return <section className="animate-enter overflow-hidden rounded-xl bg-white shadow-sm">
    <div className="flex flex-col gap-3 border-b border-black/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="font-display text-2xl">Stationen</h2><p className="text-sm text-black/45">Orte, Services und Erlebnisse</p></div>
      <div className="flex flex-wrap gap-2"><StationImport tenantId={tenant.id} categories={tenant.categories} onImport={onImport} /><button onClick={onCreate} className="rounded-xl bg-[#173c32] px-4 py-3 text-sm font-bold text-white"><Plus size={17} className="mr-2 inline" /> Neue Station</button></div>
    </div>
    <div className="p-3"><label className="flex w-full items-center gap-2 rounded-lg bg-[#f2f3ef] px-3 py-2.5"><Search size={17} /><input title="Filtere die Stationsliste nach Name, Kategorie oder Beschreibung." aria-label="Station suchen" placeholder="Station suchen …" className="min-w-0 w-full bg-transparent outline-none" /></label></div>
    <div className="divide-y divide-black/5 lg:hidden">
      {stations.map((station) => <article key={station.id} className="p-4">
        <div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-bold">{station.name}</h3><p className="mt-1 text-xs text-black/50">{station.categoryId} · {station.openingHours}</p></div><StationBadge station={station} /></div>
        <div className="mt-3 flex gap-4 text-sm"><button onClick={() => onEdit(station)} className="font-bold text-[#286551]">Bearbeiten</button><button onClick={() => onRemove(station.id)} className="text-red-600">Löschen</button></div>
      </article>)}
    </div>
    <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-y border-black/5 bg-[#fafaf8] text-xs uppercase tracking-wider text-black/40"><tr><th className="px-4 py-2">Station</th><th>Kategorie</th><th>Status</th><th>Öffnungszeiten</th><th className="px-4 text-right">Aktion</th></tr></thead><tbody>{stations.map((station) => <tr key={station.id} className="border-b border-black/5"><td className="px-4 py-3 font-bold">{station.name}</td><td>{station.categoryId}</td><td><StationBadge station={station} /></td><td className="text-black/55">{station.openingHours}</td><td className="px-4 text-right"><button onClick={() => onEdit(station)} className="font-bold text-[#286551]">Bearbeiten</button><button onClick={() => onRemove(station.id)} className="ml-4 text-red-600">Löschen</button></td></tr>)}</tbody></table></div>
  </section>;
}

function StationBadge({ station }: { station: Station }) {
  if (station.isTemplate) return <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">Vorlage</span>;
  return <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{statusLabel[station.status]}</span>;
}

const billingStatusLabel: Record<Tenant["billing"]["status"], string> = {
  trial: "Testphase",
  active: "Aktiv",
  past_due: "Zahlung offen",
  blocked: "Gesperrt"
};

const billingStatusClass: Record<Tenant["billing"]["status"], string> = {
  trial: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-700",
  past_due: "bg-orange-100 text-orange-800",
  blocked: "bg-red-100 text-red-700"
};

function BillingBadge({ tenant }: { tenant: Tenant }) {
  return <span className={cn("ml-auto shrink-0 rounded-full px-3 py-1 text-xs font-bold", billingStatusClass[tenant.billing.status])}>{billingStatusLabel[tenant.billing.status]}</span>;
}

function TenantSettings({ tenant, saving, platformAdmin, onLifecycle, onSave }: { tenant: Tenant; saving: boolean; platformAdmin: boolean; onLifecycle: (action: "archive" | "reactivate" | "delete") => void; onSave: (tenant: Tenant) => void }) {
  const [draft, setDraft] = useState(tenant);
  const hostText = draft.hosts.join(", ");
  const save = () => onSave({ ...draft, hosts: hostText.split(",").map((host) => host.trim()).filter(Boolean) });
  async function uploadSitePlan(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("purpose", "sitePlan");
    formData.set("tenantId", draft.id);
    const response = await fetch("/api/admin/uploads", { method: "POST", body: formData });
    if (!response.ok) return alert("Der Platzplan konnte nicht hochgeladen werden.");
    const payload = await response.json() as { sitePlan: NonNullable<Tenant["map"]["sitePlan"]> };
    setDraft((current) => ({ ...current, map: { ...current.map, configured: true, sitePlan: payload.sitePlan } }));
  }
  function updateSitePlanCorner(index: number, axis: 0 | 1, value: string) {
    if (!draft.map.sitePlan) return;
    const coordinates = draft.map.sitePlan.coordinates.map((point) => [...point] as [number, number]) as NonNullable<Tenant["map"]["sitePlan"]>["coordinates"];
    coordinates[index][axis] = Number(value);
    setDraft({ ...draft, map: { ...draft.map, sitePlan: { ...draft.map.sitePlan, coordinates } } });
  }
  return <div className="space-y-6">
    <SettingsCard title="Campingplatz & Link" description="Standardmäßig läuft jeder Campingplatz unter platzguide.de/c/link-kuerzel. Eigene Domains können später optional ergänzt werden.">
      <Field label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
      <Field label="Link-Kürzel" value={draft.slug} onChange={(slug) => setDraft({ ...draft, slug })} />
      <Field label="Optionale eigene Domains" value={hostText} onChange={(hosts) => setDraft({ ...draft, hosts: hosts.split(",").map((host) => host.trim()).filter(Boolean) })} />
      <div className="rounded-xl bg-[#f7f7f4] p-4 text-sm leading-6 text-black/65">
        <p className="font-bold text-[#1b302a]">Öffentlicher Link</p>
        <p>Standard-Link: <code>/c/{draft.slug}</code>. Dafür ist kein Wildcard-DNS und kein Wildcard-Zertifikat nötig.</p>
        <p>Eigene Domains sind später optional möglich: Domain per A-/CNAME-Record auf die Plattform zeigen lassen und hier eintragen.</p>
      </div>
      <Field label="Kontakt-Telefon" value={draft.contact.phone} onChange={(phone) => setDraft({ ...draft, contact: { ...draft.contact, phone } })} />
      <Field label="Kontakt-E-Mail" value={draft.contact.email} onChange={(email) => setDraft({ ...draft, contact: { ...draft.contact, email } })} />
      <Field label="Notfallkontakt" value={draft.contact.emergency} onChange={(emergency) => setDraft({ ...draft, contact: { ...draft.contact, emergency } })} />
      <Save saving={saving} onClick={save} />
    </SettingsCard>
    <SettingsCard title="Kartengrundlagen" description="Das Kernfeature: freie OpenFreeMap-Basiskarte, grafisch markierte Campingplatzfläche und optional eigener Lageplan.">
      <div className="rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"><strong>Standard:</strong> Platzguide nutzt OpenFreeMap/OSM als freie Basiskarte. Der Betreiber markiert seinen Campingplatz als Rechteck; daraus werden Mittelpunkt, Zoom und Besucherkarte sauber abgeleitet.</div>
      <CampAreaPicker mapConfig={draft.map} onChange={(map) => setDraft({ ...draft, map })} />
      <Field label="Luftbild-Tile/WMS-URL (optional)" value={draft.map.aerialTiles?.[0] ?? ""} onChange={(tile) => setDraft({ ...draft, map: { ...draft.map, configured: true, aerialTiles: tile ? [tile] : undefined } })} />
      <Field label="Luftbild-Quellenangabe" value={draft.map.aerialAttribution ?? ""} onChange={(aerialAttribution) => setDraft({ ...draft, map: { ...draft.map, aerialAttribution } })} />
      <Field label="Platzplan-Bild-URL" value={draft.map.sitePlan?.imageUrl ?? ""} onChange={(imageUrl) => setDraft({ ...draft, map: { ...draft.map, configured: Boolean(imageUrl) || draft.map.configured, sitePlan: imageUrl ? draft.map.sitePlan ?? { imageUrl, coordinates: [[draft.map.center[0] - 0.001, draft.map.center[1] + 0.001], [draft.map.center[0] + 0.001, draft.map.center[1] + 0.001], [draft.map.center[0] + 0.001, draft.map.center[1] - 0.001], [draft.map.center[0] - 0.001, draft.map.center[1] - 0.001]], attribution: "Eigener Lageplan" } : undefined } })} />
      <label className="block text-sm font-bold"><LabelText label="Platzplan hochladen" tooltip="Lade einen eigenen Lageplan als PNG, JPG, WebP oder PDF hoch." /><input title="Lade einen eigenen Lageplan als PNG, JPG, WebP oder PDF hoch." type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(event) => event.target.files?.[0] && uploadSitePlan(event.target.files[0])} className="mt-2 block w-full rounded-xl border border-dashed border-black/20 bg-[#fafaf8] p-4 text-sm font-normal" /></label>
      {draft.map.sitePlan && <div className="rounded-xl border border-black/10 p-4">
        <p className="text-sm font-bold">Vierpunkt-Kalibrierung</p>
        <p className="mt-1 text-xs text-black/45">Reihenfolge: oben links, oben rechts, unten rechts, unten links. Werte sind Längengrad/Breitengrad.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">{draft.map.sitePlan.coordinates.map((point, index) => <div key={index} className="grid gap-2 sm:grid-cols-2">
          <Field label={`P${index + 1} Längengrad`} value={String(point[0])} onChange={(value) => updateSitePlanCorner(index, 0, value)} />
          <Field label={`P${index + 1} Breitengrad`} value={String(point[1])} onChange={(value) => updateSitePlanCorner(index, 1, value)} />
        </div>)}</div>
      </div>}
      <p className="text-xs leading-5 text-black/45">Für exakte Wege abseits öffentlicher Straßen: eigenes Luftbild/Lageplan hinterlegen und über vier Eckpunkte georeferenzieren.</p>
      <Save saving={saving} onClick={save} />
    </SettingsCard>
    {platformAdmin && <SettingsCard title="Mandantenstatus" description="Archivieren sperrt die Besucher-App. Reaktivieren stellt den Mandanten wieder zur Bearbeitung bereit.">
      <div className="rounded-xl bg-[#f7f7f4] p-4 text-sm leading-6 text-black/65">
        <p><strong>Status:</strong> {billingStatusLabel[draft.billing.status]}</p>
        <p><strong>Öffentlich:</strong> {draft.billing.publicEnabled ? "Ja" : "Nein"}</p>
        <p><strong>Archiviert:</strong> {draft.archivedAt ? formatStableDate(draft.archivedAt) : "Nein"}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {draft.archivedAt
          ? <button disabled={saving} onClick={() => onLifecycle("reactivate")} className="rounded-xl border border-emerald-200 px-4 py-3 text-sm font-bold text-emerald-700 disabled:opacity-60">Reaktivieren</button>
          : <button disabled={saving} onClick={() => onLifecycle("archive")} className="rounded-xl border border-orange-200 px-4 py-3 text-sm font-bold text-orange-700 disabled:opacity-60">Archivieren / sperren</button>}
        <button disabled={saving} onClick={() => onLifecycle("delete")} className="rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-700 disabled:opacity-60">Endgültig löschen</button>
      </div>
      <p className="text-xs leading-5 text-black/45">Löschen entfernt den Mandanten dauerhaft aus der Datenbank. Vorher Backup/Export prüfen.</p>
    </SettingsCard>}
  </div>;
}
function Branding({ tenant, saving, onSave }: { tenant: Tenant; saving: boolean; onSave: (tenant: Tenant) => void }) { const [draft, setDraft] = useState(tenant); return <SettingsCard title="Erscheinungsbild" description="Farben und Texte werden nur für diesen Mandanten ausgespielt."><Field label="Claim" value={draft.tagline} onChange={(tagline) => setDraft({ ...draft, tagline })} /><Field label="Logo-Kürzel" value={draft.logoMark} onChange={(logoMark) => setDraft({ ...draft, logoMark })} /><div className="grid gap-4 sm:grid-cols-3"><Color label="Primärfarbe" value={draft.theme.primary} onChange={(primary) => setDraft({ ...draft, theme: { ...draft.theme, primary } })} /><Color label="Akzentfarbe" value={draft.theme.secondary} onChange={(secondary) => setDraft({ ...draft, theme: { ...draft.theme, secondary } })} /><Color label="Hintergrund" value={draft.theme.surface} onChange={(surface) => setDraft({ ...draft, theme: { ...draft.theme, surface } })} /></div><Save saving={saving} onClick={() => onSave(draft)} /></SettingsCard>; }
function Legal({ tenant, saving, onSave }: { tenant: Tenant; saving: boolean; onSave: (tenant: Tenant) => void }) { const [draft, setDraft] = useState(tenant); return <SettingsCard title="Rechtstexte" description="Jeder Campingplatz benötigt eigene, rechtlich geprüfte Angaben."><Area label="Impressum" value={draft.legal.imprint} onChange={(imprint) => setDraft({ ...draft, legal: { ...draft.legal, imprint } })} /><Area label="Datenschutz" value={draft.legal.privacy} onChange={(privacy) => setDraft({ ...draft, legal: { ...draft.legal, privacy } })} /><Area label="Cookie-Hinweise" value={draft.legal.cookies} onChange={(cookies) => setDraft({ ...draft, legal: { ...draft.legal, cookies } })} /><Area label="AGB / Nutzungsbedingungen" value={draft.legal.terms} onChange={(terms) => setDraft({ ...draft, legal: { ...draft.legal, terms } })} /><Save saving={saving} onClick={() => onSave(draft)} /></SettingsCard>; }
function Modules({ tenant, saving, onSave }: { tenant: Tenant; saving: boolean; onSave: (tenant: Tenant) => void }) {
  const [draft, setDraft] = useState(tenant);
  const modules = [
    { id: "events", label: "Veranstaltungen", state: "Funktionsfähig", note: "Termine in der Besucher-App anzeigen.", details: "Betreiber können Veranstaltungen mit Titel, Startzeit, Ort und Beschreibung pflegen. Aktive Termine erscheinen in der Besucher-App im Modulbereich. Es gibt aktuell noch keine Wiederholungsregeln, Kalender-Abo oder automatische Erinnerungen." },
    { id: "tours", label: "Rundgänge", state: "Funktionsfähig", note: "Geführte Wege über mehrere Stationen.", details: "Betreiber erstellen Rundgänge mit Dauer, Beschreibung und einer Liste von Stations-IDs. Besucher sehen aktive Rundgänge als Übersicht. Eine echte Schritt-für-Schritt-Navigation oder automatische Reihenfolge auf der Karte ist noch nicht ausgebaut." },
    { id: "checkins", label: "Check-ins", state: "Basis funktionsfähig", note: "Einfacher Check-in an Stationen.", details: "Ist das Modul aktiv, erscheint in Stationsdetails ein Check-in-Button. Check-ins werden aktuell lokal im Browser des Besuchers gespeichert. QR-Code-Validierung, serverseitige Historie und Betrugsschutz sind vorbereitet, aber noch nicht als vollständiger Backend-Prozess umgesetzt." },
    { id: "rewards", label: "Platzguide-Pass", state: "Basis funktionsfähig", note: "Belohnungen anhand gesammelter Check-ins anzeigen.", details: "Betreiber können Belohnungen mit benötigter Check-in-Anzahl pflegen. Besucher sehen ihren lokalen Check-in-Zähler und verfügbare Belohnungen. Eine automatische Einlösung, Gutscheincodes oder Personalprüfung ist noch nicht enthalten." },
    { id: "guestGuide", label: "Digitale Gästemappe", state: "Funktionsfähig", note: "Mandantengebundene Infos für Gäste.", details: "Betreiber pflegen kurze Gästeinfos mit Titel, Text und Sortierung. Aktive Inhalte erscheinen in der Besucher-App, sobald das Modul aktiviert ist. Typische Inhalte sind WLAN, Ruhezeiten, Anreise, Brötchenservice oder Notfallinfos." },
    { id: "feedback", label: "Feedback & Fehlermeldungen", state: "Funktionsfähig", note: "Meldungen von Besuchern empfangen.", details: "Besucher können eine kurze Meldung senden. Die Meldung wird mandantengebunden gespeichert und im Adminbereich mit Status Neu, Geprüft oder Erledigt verwaltet. Anhänge, Kategorien und automatische E-Mail-Benachrichtigungen sind noch nicht erweitert." },
    { id: "push", label: "Push-Mitteilungen", state: "Vorbereitet", note: "Noch nicht produktiv versandfähig.", details: "Das Modul ist als Schalter vorbereitet. Für echten Versand fehlen noch Web-Push-Schlüssel, Einwilligungsdialog, Geräte-Abos, Versand-API und Abmeldeverwaltung. Bis dahin sollte es nicht als produktive Funktion beworben werden." },
    { id: "occupancy", label: "Belegungs-/Statusanzeigen", state: "Vorbereitet", note: "Noch keine öffentliche Anzeige.", details: "Das Modul ist als Feature-Schalter vorbereitet. Es gibt aktuell noch kein Datenmodell für Belegung, Ampelstatus, Sensorwerte oder manuelle Statuskarten in der Besucher-App. Für später geplant: Statusfelder pro Bereich oder Einrichtung." }
  ];
  return <SettingsCard title="Funktionsmodule" description="Funktionen lassen sich je Campingplatz aktivieren. Die aufklappbaren Infos sagen klar, was heute wirklich enthalten ist.">
    <div className="space-y-3">{modules.map((module) => {
      const implemented = module.state !== "Vorbereitet";
      return <article key={module.id} className="rounded-xl border border-black/10 bg-white p-4">
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="break-words font-bold">{module.label}</p>
              <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", implemented ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800")}>{module.state}</span>
            </div>
            <p className="mt-1 text-xs text-black/45">{module.note}</p>
          </div>
          <input title={`${module.label} für diesen Campingplatz aktivieren oder deaktivieren.`} type="checkbox" checked={draft.features[module.id] ?? false} onChange={(event) => setDraft({ ...draft, features: { ...draft.features, [module.id]: event.target.checked } })} className="mt-1 h-5 w-5 shrink-0 accent-[#286551]" />
        </div>
        <details className="mt-3 rounded-lg bg-[#f7f7f4] px-3 py-2 text-sm leading-6 text-black/65">
          <summary className="cursor-pointer select-none font-bold text-[#286551]">Was macht dieses Modul?</summary>
          <p className="mt-2">{module.details}</p>
        </details>
      </article>;
    })}</div>
    <Save saving={saving} onClick={() => onSave(draft)} />
  </SettingsCard>;
}
function Integrations({ tenant, saving, platformAdmin, onSave }: { tenant: Tenant; saving: boolean; platformAdmin: boolean; onSave: (tenant: Tenant) => void }) {
  const [draft, setDraft] = useState(tenant);
  const [mailTest, setMailTest] = useState("");
  async function sendTestMail() {
    setMailTest("Sende Testmail …");
    const response = await fetch("/api/admin/mail/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: draft.id })
    });
    const payload = await response.json().catch(() => ({})) as { error?: string; recipients?: number };
    setMailTest(response.ok ? `Testmail an ${payload.recipients ?? 0} Mandanten-Admin(s) gesendet.` : payload.error ?? "Testmail fehlgeschlagen.");
  }
  return <div className="space-y-6">
    <SettingsCard title="E-Mail-Benachrichtigungen" description="E-Mails werden immer vom zentralen Platzguide-System gesendet. Mandanten können SMTP und Absender nicht ändern.">
      <div className="rounded-xl bg-[#f7f7f4] p-3 text-sm leading-6 text-black/55">
        <p><strong>Empfänger:</strong> Mandanten-Admins mit Rolle Owner oder Editor.</p>
        <p><strong>Absender:</strong> immer das zentrale System aus der Server-Konfiguration.</p>
        <p><strong>Gäste:</strong> keine E-Mails; spätere Hinweise laufen maximal über Push-Mitteilungen nach Einwilligung.</p>
        {platformAdmin && <p><strong>SMTP:</strong> Host, Port, Benutzer, Passwort, Absendername und Absenderadresse liegen nur in der Server-Umgebung.</p>}
      </div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={sendTestMail} className="rounded-xl border px-4 py-3 text-sm font-bold">Testmail an Mandanten-Admins senden</button></div>
      {mailTest && <p className="rounded-xl bg-[#eff3ec] p-3 text-sm font-bold text-[#286551]">{mailTest}</p>}
    </SettingsCard>
    <SettingsCard title="Captcha & Self-Service" description="Turnstile oder hCaptcha schützt öffentliche Registrierung.">
      <Select label="Captcha-Provider" value={draft.integrations.captcha.provider} options={["disabled", "turnstile", "hcaptcha"]} onChange={(provider) => setDraft({ ...draft, integrations: { ...draft.integrations, captcha: { ...draft.integrations.captcha, provider: provider as Tenant["integrations"]["captcha"]["provider"] } } })} />
      <Field label="Öffentlicher Site-Key" value={draft.integrations.captcha.siteKey} onChange={(siteKey) => setDraft({ ...draft, integrations: { ...draft.integrations, captcha: { ...draft.integrations.captcha, siteKey } } })} />
      <label className="flex items-center justify-between gap-4 rounded-xl border border-black/10 p-3 text-sm font-bold"><span className="inline-flex items-center gap-1.5">Für Registrierung erforderlich<HelpBubble text="Wenn aktiv, muss jede neue Registrierung zuerst die Captcha-Prüfung bestehen." /></span><input title="Wenn aktiv, muss jede neue Registrierung zuerst die Captcha-Prüfung bestehen." type="checkbox" checked={draft.integrations.captcha.requiredForSignup} onChange={(event) => setDraft({ ...draft, integrations: { ...draft.integrations, captcha: { ...draft.integrations.captcha, requiredForSignup: event.target.checked } } })} className="h-5 w-5 accent-[#286551]" /></label>
    </SettingsCard>
    <SettingsCard title="Analytics mit Matomo" description="Besucherstatistik je Campingplatz. Tracking startet erst nach Cookie-Einwilligung.">
      <label className="flex items-center justify-between gap-4 rounded-xl border border-black/10 p-3 text-sm font-bold"><span className="inline-flex items-center gap-1.5">Analytics aktivieren<HelpBubble text="Aktiviert Matomo für diesen Campingplatz. Besucher werden erst nach Zustimmung gezählt." /></span><input title="Aktiviert Matomo für diesen Campingplatz. Besucher werden erst nach Zustimmung gezählt." type="checkbox" checked={draft.tracking.enabled} onChange={(event) => setDraft({ ...draft, tracking: { ...draft.tracking, enabled: event.target.checked, provider: event.target.checked ? "matomo" : "none" } })} className="h-5 w-5 accent-[#286551]" /></label>
      <Select label="Analytics-Provider" value={draft.tracking.provider} options={["none", "matomo"]} onChange={(provider) => setDraft({ ...draft, tracking: { ...draft.tracking, provider: provider as Tenant["tracking"]["provider"], enabled: provider === "matomo" ? draft.tracking.enabled : false } })} />
      <Field label="Matomo-URL" value={draft.tracking.matomoUrl} onChange={(matomoUrl) => setDraft({ ...draft, tracking: { ...draft.tracking, matomoUrl } })} />
      <Field label="Matomo-Site-ID" value={draft.tracking.matomoSiteId || draft.tracking.measurementId} onChange={(matomoSiteId) => setDraft({ ...draft, tracking: { ...draft.tracking, matomoSiteId, measurementId: matomoSiteId } })} />
      <label className="flex items-center justify-between gap-4 rounded-xl border border-black/10 p-3 text-sm font-bold"><span className="inline-flex items-center gap-1.5">IP anonymisieren<HelpBubble text="Empfohlen für Datenschutz: Matomo speichert IP-Adressen gekürzt." /></span><input title="Empfohlen für Datenschutz: Matomo speichert IP-Adressen gekürzt." type="checkbox" checked={draft.tracking.anonymizeIp} onChange={(event) => setDraft({ ...draft, tracking: { ...draft.tracking, anonymizeIp: event.target.checked } })} className="h-5 w-5 accent-[#286551]" /></label>
      <label className="flex items-center justify-between gap-4 rounded-xl border border-black/10 p-3 text-sm font-bold"><span className="inline-flex items-center gap-1.5">Do-Not-Track respektieren<HelpBubble text="Wenn aktiv, wird bei gesetztem Browser-Datenschutzsignal nicht getrackt." /></span><input title="Wenn aktiv, wird bei gesetztem Browser-Datenschutzsignal nicht getrackt." type="checkbox" checked={draft.tracking.respectDoNotTrack} onChange={(event) => setDraft({ ...draft, tracking: { ...draft.tracking, respectDoNotTrack: event.target.checked } })} className="h-5 w-5 accent-[#286551]" /></label>
      {draft.tracking.matomoUrl && <a href={draft.tracking.matomoUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit rounded-xl border border-black/10 px-4 py-3 text-sm font-bold">Matomo öffnen</a>}
      <p className="rounded-xl bg-[#f7f7f4] p-3 text-xs leading-5 text-black/55">Wichtig: Matomo muss separat betrieben oder gebucht werden. Hier wird nur die Verbindung je Mandant verwaltet.</p>
    </SettingsCard>
    <SettingsCard title="Dateiablage, Datenbank & Backup" description="Betriebsparameter für Uploads, PostgreSQL und Sicherungen.">
      <div className="rounded-xl bg-[#f7f7f4] p-4 text-sm leading-6 text-black/65"><strong className="text-[#1b302a]">Wichtig:</strong> Mandanten, Stationen, Einstellungen, Audit-Log und Metadaten liegen in PostgreSQL. Die Dateiablage betrifft nur hochgeladene Bilder, PDFs und Videos; bei „Server-Dateisystem“ werden diese Dateien lokal auf dem Server gespeichert und tenantgetrennt referenziert.</div>
      <label className="block min-w-0 text-sm font-bold"><LabelText label="Dateiablage für Uploads" tooltip="Speicherort für hochgeladene Medien. Die eigentlichen App-Daten liegen weiterhin in PostgreSQL." /><select title="Speicherort für hochgeladene Medien. Die eigentlichen App-Daten liegen weiterhin in PostgreSQL." aria-label="Dateiablage für Uploads" value={draft.integrations.storage.provider} onChange={(event) => setDraft({ ...draft, integrations: { ...draft.integrations, storage: { ...draft.integrations.storage, provider: event.target.value as Tenant["integrations"]["storage"]["provider"] } } })} className="mt-2 w-full rounded-xl border border-black/10 bg-[#fafaf8] px-4 py-3 outline-none">
        <option value="local">Server-Dateisystem, tenantgetrennt</option>
        <option value="s3">S3-kompatibler Objektspeicher</option>
        <option value="external-url">Externe Medien-URLs</option>
      </select></label>
      <Field label="Max. Upload MB" value={String(draft.integrations.storage.maxUploadMb)} onChange={(maxUploadMb) => setDraft({ ...draft, integrations: { ...draft.integrations, storage: { ...draft.integrations.storage, maxUploadMb: Number(maxUploadMb) } } })} />
      <Area label="Erlaubte MIME-Typen" value={draft.integrations.storage.allowedTypes.join("\n")} onChange={(value) => setDraft({ ...draft, integrations: { ...draft.integrations, storage: { ...draft.integrations.storage, allowedTypes: value.split("\n").map((item) => item.trim()).filter(Boolean) } } })} />
      <Select label="Datenbank" value={draft.integrations.database.provider} options={["postgresql"]} onChange={() => setDraft({ ...draft, integrations: { ...draft.integrations, database: { ...draft.integrations.database, provider: "postgresql" } } })} />
      <label className="flex items-center justify-between gap-4 rounded-xl border border-black/10 p-3 text-sm font-bold"><span className="inline-flex items-center gap-1.5">RLS erzwingen<HelpBubble text="Sicherheitsregel, damit Datenbankdaten nur zum passenden Campingplatz gelesen werden." /></span><input title="Sicherheitsregel, damit Datenbankdaten nur zum passenden Campingplatz gelesen werden." type="checkbox" checked={draft.integrations.database.rlsRequired} onChange={(event) => setDraft({ ...draft, integrations: { ...draft.integrations, database: { ...draft.integrations.database, rlsRequired: event.target.checked } } })} className="h-5 w-5 accent-[#286551]" /></label>
      <label className="flex items-center justify-between gap-4 rounded-xl border border-black/10 p-3 text-sm font-bold"><span className="inline-flex items-center gap-1.5">Backups aktiv<HelpBubble text="Wenn aktiv, sollen regelmäßig Sicherungen der Datenbank erstellt werden." /></span><input title="Wenn aktiv, sollen regelmäßig Sicherungen der Datenbank erstellt werden." type="checkbox" checked={draft.integrations.backup.enabled} onChange={(event) => setDraft({ ...draft, integrations: { ...draft.integrations, backup: { ...draft.integrations.backup, enabled: event.target.checked } } })} className="h-5 w-5 accent-[#286551]" /></label>
      <Field label="Backup-Zeitplan" value={draft.integrations.backup.schedule} onChange={(schedule) => setDraft({ ...draft, integrations: { ...draft.integrations, backup: { ...draft.integrations.backup, schedule } } })} />
      <Field label="Aufbewahrung Tage" value={String(draft.integrations.backup.retentionDays)} onChange={(retentionDays) => setDraft({ ...draft, integrations: { ...draft.integrations, backup: { ...draft.integrations.backup, retentionDays: Number(retentionDays) } } })} />
      <Save saving={saving} onClick={() => onSave(draft)} />
    </SettingsCard>
  </div>;
}

function Billing({ tenant, saving, onSave }: { tenant: Tenant; saving: boolean; onSave: (tenant: Tenant) => void }) {
  const [draft, setDraft] = useState(tenant);
  const usedMb = storageUsedMb(draft);
  const yearlyPrice = Math.round(draft.billing.monthlyPriceCents * 12 * (1 - draft.billing.yearlyDiscountPercent / 100));
  const frontendState = draft.billing.publicEnabled && draft.billing.status === "active" ? "öffentlich sichtbar" : "nur für Admins/Betreiber testbar";
  function choosePlan(plan: Tenant["billing"]["plan"]) {
    setDraft((current) => applyBillingPlan(current, plan));
  }
  return <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-4">
      <Metric label="Abo" value={billingPlans[draft.billing.plan].label} note="Monatlich kündbar" icon={<CreditCard />} />
      <Metric label="Status" value={billingStatusLabel[draft.billing.status]} note={frontendState} icon={<ShieldCheck />} />
      <Metric label="Speicher" value={`${usedMb} MB`} note={`von ${draft.billing.storageLimitMb} MB genutzt`} icon={<ImageIcon />} />
      <Metric label="Support" value={`${draft.billing.supportResponseHours}h`} note="max. Reaktionszeit" icon={<LifeBuoy />} />
    </div>
    <SettingsCard title="Pakete" description="Der Betreiber kann einrichten und testen. Öffentlich wird die App erst nach manueller Freigabe.">
      <div className="grid gap-4 lg:grid-cols-2">
        {Object.entries(billingPlans).map(([id, plan]) => <button key={id} onClick={() => choosePlan(id as Tenant["billing"]["plan"])} className={cn("rounded-2xl border p-4 text-left transition", draft.billing.plan === id ? "border-[#173c32] bg-[#eff3ec]" : "border-black/10 bg-white hover:border-[#173c32]/40")}>
          <p className="text-xs font-bold uppercase tracking-widest text-[#286551]">{plan.label}</p>
          <p className="mt-2 font-display text-4xl">{formatEuro(plan.monthlyPriceCents)}</p>
          <p className="text-sm text-black/55">monatlich kündbar</p>
          <ul className="mt-4 space-y-2 text-sm text-black/65">
            <li>{plan.storageLimitMb >= 1024 ? "1 GB" : `${plan.storageLimitMb} MB`} Speicher</li>
            <li>Support innerhalb {plan.supportResponseHours}h</li>
            <li>{plan.customDomainEnabled ? "Eigene Domain möglich" : "Platzguide-Link inklusive"}</li>
            <li>Öffentlich erst nach manueller Freigabe</li>
          </ul>
        </button>)}
      </div>
      <div className="rounded-xl bg-[#f7f7f4] p-4 text-sm leading-6 text-black/65">
        <p><strong>Jahreszahlung:</strong> {draft.billing.yearlyDiscountPercent}% Rabatt, aktuell {formatEuro(yearlyPrice)} pro Jahr.</p>
        <p><strong>Einrichtungsservice:</strong> optional durch Michael für {formatEuro(draft.billing.setupServicePriceCents)} einmalig.</p>
      </div>
    </SettingsCard>
    <SettingsCard title="Veröffentlichung" description="Du steuerst manuell, ob Besucher den Platzguide-Link sehen dürfen.">
      <label className="flex items-center justify-between gap-4 rounded-xl border border-black/10 p-4 text-sm font-bold"><span className="inline-flex items-center gap-1.5">Besucher-App öffentlich freischalten<HelpBubble text="Erst wenn dieses Feld aktiv ist und der Status aktiv ist, können anonyme Besucher den Platzguide sehen." /></span><input title="Erst wenn dieses Feld aktiv ist und der Status aktiv ist, können anonyme Besucher den Platzguide sehen." type="checkbox" checked={draft.billing.publicEnabled} onChange={(event) => setDraft({ ...draft, billing: { ...draft.billing, publicEnabled: event.target.checked, status: event.target.checked ? "active" : draft.billing.status } })} className="h-5 w-5 accent-[#286551]" /></label>
      <Select label="Status" value={draft.billing.status} options={["trial", "active", "past_due", "blocked"]} onChange={(status) => setDraft({ ...draft, billing: { ...draft.billing, status: status as Tenant["billing"]["status"], publicEnabled: status === "active" ? draft.billing.publicEnabled : false } })} />
      <label className="flex items-center justify-between gap-4 rounded-xl border border-black/10 p-4 text-sm font-bold"><span className="inline-flex items-center gap-1.5">Einrichtungsservice gebucht<HelpBubble text="Markiert, ob die optionale Einrichtung durch dich gebucht wurde." /></span><input title="Markiert, ob die optionale Einrichtung durch dich gebucht wurde." type="checkbox" checked={draft.billing.setupServiceBooked ?? false} onChange={(event) => setDraft({ ...draft, billing: { ...draft.billing, setupServiceBooked: event.target.checked } })} className="h-5 w-5 accent-[#286551]" /></label>
      <div className="rounded-xl bg-[#f7f7f4] p-4 text-sm leading-6 text-black/65">
        <p><strong>Speicher:</strong> {usedMb} MB von {draft.billing.storageLimitMb} MB genutzt.</p>
        <p><strong>Frontend:</strong> {frontendState}.</p>
        <p><strong>Statuslogik:</strong> Nur <code>active</code> plus Freischaltung macht die Besucher-App öffentlich. <code>trial</code>, <code>past_due</code> und <code>blocked</code> bleiben gesperrt.</p>
      </div>
      <Save saving={saving} onClick={() => onSave(draft)} />
    </SettingsCard>
  </div>;
}

function Categories({ tenant, saving, onSave }: { tenant: Tenant; saving: boolean; onSave: (tenant: Tenant) => void }) {
  const [draft, setDraft] = useState(tenant);
  const update = (id: string, changes: Partial<Category>) => setDraft({ ...draft, categories: draft.categories.map((category) => category.id === id ? { ...category, ...changes } : category) });
  const add = () => setDraft({ ...draft, categories: [...draft.categories, { id: `cat-${crypto.randomUUID().slice(0, 8)}`, name: "Neue Kategorie", icon: "MapPinned", color: "#286551" }] });
  return <SettingsCard title="Kategorien" description="Kategorien strukturieren Filter, Listen und Admin-Importe.">
    <div className="space-y-3">{draft.categories.map((category) => <div key={category.id} className="grid gap-3 rounded-xl border border-black/10 p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
      <Field label="ID" value={category.id} onChange={(id) => update(category.id, { id })} />
      <Field label="Name" value={category.name} onChange={(name) => update(category.id, { name })} />
      <Color label="Farbe" value={category.color} onChange={(color) => update(category.id, { color })} />
      <button onClick={() => setDraft({ ...draft, categories: draft.categories.filter((item) => item.id !== category.id) })} className="self-end rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-600">Entfernen</button>
    </div>)}</div>
    <div className="flex flex-wrap gap-2"><button onClick={add} className="rounded-xl border px-4 py-3 text-sm font-bold">Kategorie hinzufügen</button><Save saving={saving} onClick={() => onSave(draft)} /></div>
  </SettingsCard>;
}
function Media({ tenant, saving, onSave }: { tenant: Tenant; saving: boolean; onSave: (tenant: Tenant) => void }) {
  const [draft, setDraft] = useState(tenant);
  const add = () => setDraft({ ...draft, media: [{ id: crypto.randomUUID(), tenantId: draft.id, title: "Neues Medium", url: "/icons/icon-512.png", type: "image", alt: "", createdAt: new Date().toISOString() }, ...draft.media] });
  const update = (id: string, changes: Partial<MediaAsset>) => setDraft({ ...draft, media: draft.media.map((item) => item.id === id ? { ...item, ...changes } : item) });
  async function uploadMedia(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("purpose", "media");
    formData.set("tenantId", draft.id);
    const response = await fetch("/api/admin/uploads", { method: "POST", body: formData });
    if (!response.ok) return alert("Upload fehlgeschlagen.");
    const media = await response.json() as MediaAsset;
    setDraft((current) => ({ ...current, media: [media, ...current.media] }));
  }
  return <SettingsCard title="Medienbibliothek" description="Bilder, PDFs und kurze Videos zentral verwalten.">
    <p className="rounded-xl bg-[#f7f7f4] p-3 text-sm text-black/55">Speicher genutzt: <strong>{storageUsedMb(draft)} MB</strong> von <strong>{draft.billing.storageLimitMb} MB</strong>.</p>
    <div className="flex flex-wrap gap-2"><button onClick={add} className="rounded-xl border px-4 py-3 text-sm font-bold"><Plus size={16} className="mr-2 inline" />Medium hinzufügen</button><label className="rounded-xl border px-4 py-3 text-sm font-bold">Datei hochladen<input title="Bild, PDF oder kurzes Video in die Medienbibliothek hochladen." type="file" accept="image/png,image/jpeg,image/webp,application/pdf,video/mp4,video/webm" className="sr-only" onChange={(event) => event.target.files?.[0] && uploadMedia(event.target.files[0])} /></label><Save saving={saving} onClick={() => onSave(draft)} /></div>
    <div className="grid gap-3 lg:grid-cols-2">{draft.media.map((asset) => <div key={asset.id} className="rounded-xl border border-black/10 p-3"><Field label="Titel" value={asset.title} onChange={(title) => update(asset.id, { title })} /><Field label="URL" value={asset.url} onChange={(url) => update(asset.id, { url })} /><Field label="Alternativtext" value={asset.alt} onChange={(alt) => update(asset.id, { alt })} />{asset.sizeBytes && <p className="mt-2 text-xs text-black/45">{Math.round(asset.sizeBytes / 1024 / 1024 * 10) / 10} MB · {asset.type}</p>}<button onClick={() => setDraft({ ...draft, media: draft.media.filter((item) => item.id !== asset.id) })} className="mt-3 text-sm font-bold text-red-600">Entfernen</button></div>)}</div>
  </SettingsCard>;
}
function Events({ tenant, saving, onSave }: { tenant: Tenant; saving: boolean; onSave: (tenant: Tenant) => void }) {
  const [draft, setDraft] = useState(tenant);
  const add = () => setDraft({ ...draft, events: [{ id: crypto.randomUUID(), tenantId: draft.id, title: "Neue Veranstaltung", startsAt: new Date().toISOString(), location: "", description: "", active: true }, ...draft.events] });
  const update = (id: string, changes: Partial<EventItem>) => setDraft({ ...draft, events: draft.events.map((item) => item.id === id ? { ...item, ...changes } : item) });
  return <SettingsCard title="Veranstaltungen" description="Termine erscheinen in der Besucher-App, wenn das Modul aktiv ist."><ModuleListHeader onAdd={add} saving={saving} onSave={() => onSave(draft)} />{draft.events.map((event) => <AdminItem key={event.id} active={event.active} onToggle={(active) => update(event.id, { active })} onRemove={() => setDraft({ ...draft, events: draft.events.filter((item) => item.id !== event.id) })}><Field label="Titel" value={event.title} onChange={(title) => update(event.id, { title })} /><Field label="Startzeit ISO" value={event.startsAt} onChange={(startsAt) => update(event.id, { startsAt })} /><Field label="Ort" value={event.location} onChange={(location) => update(event.id, { location })} /><Area label="Beschreibung" value={event.description} onChange={(description) => update(event.id, { description })} /></AdminItem>)}</SettingsCard>;
}
function Tours({ tenant, stations, saving, onSave }: { tenant: Tenant; stations: Station[]; saving: boolean; onSave: (tenant: Tenant) => void }) {
  const [draft, setDraft] = useState(tenant);
  const add = () => setDraft({ ...draft, tours: [{ id: crypto.randomUUID(), tenantId: draft.id, title: "Neuer Rundgang", description: "", durationMinutes: 30, active: true, stops: stations.slice(0, 2).map((station) => ({ stationId: station.id, note: "" })) }, ...draft.tours] });
  const update = (id: string, changes: Partial<Tour>) => setDraft({ ...draft, tours: draft.tours.map((item) => item.id === id ? { ...item, ...changes } : item) });
  return <SettingsCard title="Rundgänge" description="Geführte Wege über mehrere Stationen, auch abseits öffentlicher Straßen."><ModuleListHeader onAdd={add} saving={saving} onSave={() => onSave(draft)} />{draft.tours.map((tour) => <AdminItem key={tour.id} active={tour.active} onToggle={(active) => update(tour.id, { active })} onRemove={() => setDraft({ ...draft, tours: draft.tours.filter((item) => item.id !== tour.id) })}><Field label="Titel" value={tour.title} onChange={(title) => update(tour.id, { title })} /><Field label="Dauer Minuten" value={String(tour.durationMinutes)} onChange={(durationMinutes) => update(tour.id, { durationMinutes: Number(durationMinutes) })} /><Area label="Beschreibung" value={tour.description} onChange={(description) => update(tour.id, { description })} /><Area label="Stations-IDs, eine pro Zeile" value={tour.stops.map((stop) => stop.stationId).join("\n")} onChange={(value) => update(tour.id, { stops: value.split("\n").filter(Boolean).map((stationId) => ({ stationId, note: "" })) })} /></AdminItem>)}</SettingsCard>;
}
function Rewards({ tenant, saving, onSave }: { tenant: Tenant; saving: boolean; onSave: (tenant: Tenant) => void }) {
  const [draft, setDraft] = useState(tenant);
  const add = () => setDraft({ ...draft, rewards: [{ id: crypto.randomUUID(), tenantId: draft.id, title: "Neue Belohnung", description: "", requiredCheckins: 3, active: true }, ...draft.rewards] });
  const update = (id: string, changes: Partial<Reward>) => setDraft({ ...draft, rewards: draft.rewards.map((item) => item.id === id ? { ...item, ...changes } : item) });
  return <SettingsCard title="Platzguide-Pass" description="Belohnungen für QR- oder GPS-Check-ins vorbereiten."><ModuleListHeader onAdd={add} saving={saving} onSave={() => onSave(draft)} />{draft.rewards.map((reward) => <AdminItem key={reward.id} active={reward.active} onToggle={(active) => update(reward.id, { active })} onRemove={() => setDraft({ ...draft, rewards: draft.rewards.filter((item) => item.id !== reward.id) })}><Field label="Titel" value={reward.title} onChange={(title) => update(reward.id, { title })} /><Field label="Benötigte Check-ins" value={String(reward.requiredCheckins)} onChange={(requiredCheckins) => update(reward.id, { requiredCheckins: Number(requiredCheckins) })} /><Area label="Beschreibung" value={reward.description} onChange={(description) => update(reward.id, { description })} /></AdminItem>)}</SettingsCard>;
}
function GuestGuide({ tenant, saving, onSave }: { tenant: Tenant; saving: boolean; onSave: (tenant: Tenant) => void }) {
  const [draft, setDraft] = useState(tenant);
  const add = () => setDraft({ ...draft, guestGuide: [{ id: crypto.randomUUID(), tenantId: draft.id, title: "Neuer Eintrag", body: "", sortOrder: draft.guestGuide.length + 1 }, ...draft.guestGuide] });
  const update = (id: string, changes: Partial<GuestGuideItem>) => setDraft({ ...draft, guestGuide: draft.guestGuide.map((item) => item.id === id ? { ...item, ...changes } : item) });
  return <SettingsCard title="Digitale Gästemappe" description="Kurze, verständliche Infos für Gäste."><ModuleListHeader onAdd={add} saving={saving} onSave={() => onSave(draft)} />{draft.guestGuide.map((item) => <AdminItem key={item.id} active onToggle={() => undefined} onRemove={() => setDraft({ ...draft, guestGuide: draft.guestGuide.filter((entry) => entry.id !== item.id) })}><Field label="Titel" value={item.title} onChange={(title) => update(item.id, { title })} /><Field label="Sortierung" value={String(item.sortOrder)} onChange={(sortOrder) => update(item.id, { sortOrder: Number(sortOrder) })} /><Area label="Text" value={item.body} onChange={(body) => update(item.id, { body })} /></AdminItem>)}</SettingsCard>;
}
function Feedback({ tenant, saving, onSave }: { tenant: Tenant; saving: boolean; onSave: (tenant: Tenant) => void }) {
  const [draft, setDraft] = useState(tenant);
  return <SettingsCard title="Feedback & Fehlermeldungen" description="Eingänge prüfen und Status setzen.">
    {draft.feedback.length === 0 && <p className="rounded-xl bg-[#f7f7f4] p-4 text-sm text-black/55">Noch keine Meldungen vorhanden.</p>}
    {draft.feedback.map((message) => <div key={message.id} className="rounded-xl border border-black/10 p-4"><p className="text-xs text-black/45">{formatStableDate(message.createdAt)}</p><p className="mt-2">{message.message}</p><select title="Bearbeitungsstatus dieser Meldung setzen." aria-label="Feedback-Status" value={message.status} onChange={(event) => setDraft({ ...draft, feedback: draft.feedback.map((item) => item.id === message.id ? { ...item, status: event.target.value as typeof message.status } : item) })} className="mt-3 rounded-xl border p-3"><option value="new">Neu</option><option value="reviewed">Geprüft</option><option value="resolved">Erledigt</option></select></div>)}
    <Save saving={saving} onClick={() => onSave(draft)} />
  </SettingsCard>;
}
function formatStableDate(value: string) {
  return value.slice(0, 16).replace("T", " ");
}
function Profile({ tenant, adminEmail }: { tenant: Tenant; adminEmail: string }) {
  async function requestDeletion() {
    if (!confirm("Löschanfrage für diesen Mandanten erstellen?")) return;
    const response = await fetch("/api/admin/privacy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "delete" })
    });
    alert(response.ok ? "Löschanfrage wurde protokolliert." : "Löschanfrage fehlgeschlagen.");
  }
  return <div className="grid gap-6 xl:grid-cols-2">
    <SettingsCard title="Profil" description="Zugriff und Verantwortlichkeit für diesen Campingplatz.">
      <p className="rounded-xl bg-[#f7f7f4] p-4 text-sm"><strong>{adminEmail}</strong><br />Plattform- oder Betreiberzugang</p>
      <p className="text-sm text-black/55">Mandant: {tenant.name}<br />Tenant-ID: <span className="break-all">{tenant.id}</span></p>
    </SettingsCard>
    <SettingsCard title="Datenschutz" description="Export und Löschanfragen werden protokolliert.">
      <a href="/api/admin/privacy" target="_blank" className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold"><Download size={17} /> Datenexport öffnen</a>
      <button onClick={requestDeletion} className="ml-0 inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-700 sm:ml-2"><Trash2 size={17} /> Löschanfrage erstellen</button>
      <p className="text-xs leading-5 text-black/45">Produktive Löschung sollte erst nach Identitätsprüfung und Backup-Frist final ausgeführt werden.</p>
    </SettingsCard>
  </div>;
}
function Security() { return <div className="grid min-w-0 gap-6 xl:grid-cols-2"><SettingsCard title="Sicherheitsstatus" description="Zentrale Schutzmaßnahmen für die Plattform.">{["Rollenmodell für Plattform und Mandanten", "HTTP-only Session-Cookie", "Tenant-Kontext pro Anfrage", "Datenbank-RLS aktiv", "Datenschutz-Export und Löschanfrage"].map((item) => <p key={item} className="flex min-w-0 items-center gap-3 border-b border-black/5 py-3 text-sm"><ShieldCheck size={18} className="shrink-0 text-emerald-600" /><span className="min-w-0 break-words">{item}</span></p>)}</SettingsCard><SettingsCard title="Produktions-Checkliste" description="Diese Punkte müssen beim Deployment gesetzt werden.">{["Sicheres ADMIN_PASSWORD_HASH", "Zufälliges AUTH_SECRET", "PostgreSQL-Verbindung", "DNS und TLS für Hauptdomain", "E-Mail-Verifikation und Rate-Limits", "Rechtstexte juristisch prüfen"].map((item) => <label key={item} className="flex min-w-0 items-center gap-3 border-b border-black/5 py-3 text-sm"><input title={`${item} als erledigt markieren.`} type="checkbox" className="h-4 w-4 shrink-0" /><span className="min-w-0 break-words">{item}</span></label>)}</SettingsCard></div>; }
function SettingsCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <section className="min-w-0 w-full overflow-hidden animate-enter rounded-xl bg-white p-5 shadow-sm"><h2 className="break-words font-display text-2xl">{title}</h2><p className="mt-1 break-words text-sm text-black/45">{description}</p><div className="mt-4 min-w-0 space-y-4">{children}</div></section>; }
function ModuleListHeader({ onAdd, saving, onSave }: { onAdd: () => void; saving: boolean; onSave: () => void }) { return <div className="flex flex-wrap gap-2"><button onClick={onAdd} className="rounded-xl border px-4 py-3 text-sm font-bold"><Plus size={16} className="mr-2 inline" />Hinzufügen</button><Save saving={saving} onClick={onSave} /></div>; }
function AdminItem({ active, onToggle, onRemove, children }: { active: boolean; onToggle: (active: boolean) => void; onRemove: () => void; children: React.ReactNode }) { return <div className="space-y-3 rounded-xl border border-black/10 p-4"><div className="flex items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm font-bold"><input title="Eintrag aktivieren oder deaktivieren." type="checkbox" checked={active} onChange={(event) => onToggle(event.target.checked)} className="h-4 w-4 accent-[#286551]" /> Aktiv</label><button onClick={onRemove} className="text-sm font-bold text-red-600">Entfernen</button></div>{children}</div>; }
function Field({ label, value, suffix, onChange }: { label: string; value: string; suffix?: string; onChange: (value: string) => void }) { const tooltip = tooltipForLabel(label); return <label className="block min-w-0 text-sm font-bold"><LabelText label={label} tooltip={tooltip} /><div className="mt-2 flex rounded-xl border border-black/10 bg-[#fafaf8]"><input title={tooltip} aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent px-4 py-3 outline-none" />{suffix && <span className="shrink-0 border-l border-black/10 px-3 py-3 text-black/40">{suffix}</span>}</div></label>; }
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { const tooltip = tooltipForLabel(label); return <label className="block min-w-0 text-sm font-bold"><LabelText label={label} tooltip={tooltip} /><select title={tooltip} aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-black/10 bg-[#fafaf8] px-4 py-3 outline-none">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }
function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { const tooltip = tooltipForLabel(label); return <label className="block min-w-0 text-sm font-bold"><LabelText label={label} tooltip={tooltip} /><textarea title={tooltip} aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-black/10 bg-[#fafaf8] px-4 py-3 font-normal leading-6 outline-none" /></label>; }
function Color({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { const tooltip = tooltipForLabel(label); return <label className="min-w-0 text-sm font-bold"><LabelText label={label} tooltip={tooltip} /><div className="mt-2 flex items-center gap-2 rounded-xl border border-black/10 p-2"><input type="color" title={tooltip} aria-label={`${label} auswählen`} value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-10 shrink-0 border-0 bg-transparent" /><input title={`${tooltip} Hex-Code, z. B. #286551.`} aria-label={`${label} Hex-Code`} value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" /></div></label>; }
function LabelText({ label, tooltip }: { label: string; tooltip: string }) { return <span className="flex min-w-0 items-center gap-1.5">{label}<HelpBubble text={tooltip} /></span>; }
function HelpBubble({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);
  return <span ref={wrapperRef} className="relative inline-flex shrink-0 text-[#286551]">
    <button type="button" aria-label="Hilfe anzeigen" onClick={(event) => { event.stopPropagation(); setOpen((value) => !value); }} className="rounded-full p-0.5 text-[#286551]"><HelpCircle size={15} aria-hidden="true" /></button>
    {open && <span className="absolute left-1/2 top-7 z-40 w-64 max-w-[80vw] -translate-x-1/2 rounded-xl bg-[#173c32] p-3 text-xs font-normal leading-5 text-white shadow-xl">{text}</span>}
  </span>;
}
function tooltipForLabel(label: string) {
  const exact: Record<string, string> = {
    "Name": "Der sichtbare Name, der in Listen, Überschriften oder Karten erscheint.",
    "Link-Kürzel": "Kurzer eindeutiger Linkteil ohne Leerzeichen, z. B. sonnental für /c/sonnental.",
    "Optionale eigene Domains": "Eigene Domains kommasepariert eintragen, z. B. camping.example.de. Leer lassen, wenn nur der Platzguide-Link genutzt wird.",
    "Kontakt-Telefon": "Telefonnummer für Gäste und Kontaktbereiche.",
    "Kontakt-E-Mail": "Öffentliche Kontaktadresse des Campingplatzes.",
    "Notfallkontakt": "Telefonnummer oder kurzer Hinweis für dringende Fälle.",
    "Kartenstil-URL": "URL eines MapLibre-kompatiblen Kartenstils. Standard ist die freie Basiskarte.",
    "Mittelpunkt Längengrad": "Ost-West-Koordinate des Kartenmittelpunkts, z. B. 10.123456.",
    "Mittelpunkt Breitengrad": "Nord-Süd-Koordinate des Kartenmittelpunkts, z. B. 49.123456.",
    "Start-Zoom": "Startvergrößerung der Karte. Höhere Werte zeigen mehr Details.",
    "Luftbild-Tile/WMS-URL (optional)": "Optionale URL für lizenzierte Luftbild-Kacheln oder WMS-Daten.",
    "Luftbild-Quellenangabe": "Pflichtangabe zur verwendeten Luftbildquelle oder Lizenz.",
    "Platzplan-Bild-URL": "URL zu einem eigenen Lageplan, der über vier Eckpunkte kalibriert werden kann.",
    "Claim": "Kurzer Untertitel oder Slogan für den Campingplatz.",
    "Logo-Kürzel": "Kurzes Zeichen oder Kürzel, falls kein eigenes Logo hinterlegt ist.",
    "Impressum": "Vollständiger Impressumstext des jeweiligen Betreibers.",
    "Datenschutz": "Datenschutzerklärung des jeweiligen Betreibers.",
    "Cookie-Hinweise": "Hinweise zu notwendigen und optionalen Cookies.",
    "AGB / Nutzungsbedingungen": "Nutzungsbedingungen für den jeweiligen Platzguide oder Dienst.",
    "Provider": "Auswahl des genutzten Diensttyps.",
    "Captcha-Provider": "Dienst gegen automatische Bot-Registrierungen.",
    "Öffentlicher Site-Key": "Öffentlicher Captcha-Schlüssel für das Frontend.",
    "Analytics-Provider": "Statistikdienst für diesen Campingplatz. Matomo wird erst nach Einwilligung geladen.",
    "Matomo-URL": "Basisadresse deiner Matomo-Installation, z. B. https://analytics.example.de.",
    "Matomo-Site-ID": "Die Website-ID aus Matomo für genau diesen Campingplatz.",
    "Dateiablage für Uploads": "Speicherort für hochgeladene Medien. Die eigentlichen App-Daten liegen weiterhin in PostgreSQL.",
    "Max. Upload MB": "Maximale Größe pro Datei in Megabyte.",
    "Erlaubte MIME-Typen": "Eine erlaubte Dateiart pro Zeile, z. B. image/jpeg.",
    "Datenbank": "Produktiv verwendetes Datenbanksystem.",
    "Backup-Zeitplan": "Zeitplan für automatische Backups, z. B. daily oder 03:00.",
    "Aufbewahrung Tage": "Wie viele Tage Backups behalten werden.",
    "Status": "Aktueller Veröffentlichungs- oder Betriebsstatus.",
    "Paket": "Gewähltes Preismodell des Mandanten.",
    "Monatspreis Cent": "Monatspreis in Cent, z. B. 499 für 4,99 €.",
    "Speicherlimit MB": "Maximal erlaubter Speicherplatz dieses Mandanten.",
    "Support-Reaktionszeit Stunden": "Zielzeit für eine erste Support-Reaktion.",
    "Jahresrabatt Prozent": "Rabatt bei jährlicher Zahlung in Prozent.",
    "ID": "Interne eindeutige Kennung. Nur ändern, wenn du weißt, wo sie verwendet wird.",
    "Farbe": "Hex-Farbwert für Darstellung und Markierungen.",
    "Titel": "Kurzer sichtbarer Titel.",
    "URL": "Vollständiger oder interner Pfad zur Datei oder Ressource.",
    "Alternativtext": "Kurze Bildbeschreibung für Barrierefreiheit.",
    "Startzeit ISO": "Zeitpunkt im ISO-Format, z. B. 2026-07-11T18:00:00.000Z.",
    "Ort": "Ort oder Treffpunkt.",
    "Beschreibung": "Ausführlicher Text für Besucher oder Verwaltung.",
    "Dauer Minuten": "Dauer als Zahl in Minuten.",
    "Stations-IDs, eine pro Zeile": "Interne Station-IDs des Rundgangs, jede ID in eine eigene Zeile.",
    "Benötigte Check-ins": "Anzahl der Check-ins, die für diese Belohnung nötig sind.",
    "Sortierung": "Kleine Zahlen erscheinen weiter oben."
  };
  if (exact[label]) return exact[label];
  if (label.includes("Längengrad")) return "Ost-West-Koordinate als Dezimalzahl.";
  if (label.includes("Breitengrad")) return "Nord-Süd-Koordinate als Dezimalzahl.";
  return "Trage hier den passenden Wert für dieses Feld ein.";
}
function Save({ saving, onClick }: { saving: boolean; onClick: () => void }) { return <button onClick={onClick} disabled={saving} className="rounded-xl bg-[#173c32] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? "Speichert …" : "Änderungen speichern"}</button>; }

function blankStation(tenantId: string): Station { return { id: crypto.randomUUID(), tenantId, categoryId: "service", name: "", shortDescription: "", description: "", openingHours: "Durchgehend geöffnet", status: "open", latitude: 0, longitude: 0, position: { x: 50, y: 50 }, image: "linear-gradient(135deg, #c9d8c2, #527761)" }; }
function StationEditor({ station, categories, mapConfig, onClose, onSave }: {
  station: Station;
  categories: Tenant["categories"];
  mapConfig: Tenant["map"];
  onClose: () => void;
  onSave: (station: Station) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState(station);
  return <div className="fixed inset-0 z-50 flex justify-end overflow-hidden bg-black/35">
    <form onSubmit={(event) => { event.preventDefault(); onSave(draft); }} className="h-full w-full max-w-xl overflow-x-hidden overflow-y-auto bg-white p-4 shadow-2xl sm:p-6">
      <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[#286551]">Stationseditor</p><h2 className="font-display text-3xl">{station.name || "Neue Station"}</h2></div><button type="button" onClick={onClose} className="rounded-full bg-black/5 p-2"><X /></button></div>
      <div className="mt-8 space-y-5">
        <label className="block text-sm font-bold"><LabelText label="Name" tooltip={tooltipForLabel("Name")} /><input required title={tooltipForLabel("Name")} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-2 w-full rounded-xl border p-3" /></label>
        <label className="block text-sm font-bold"><LabelText label="Kategorie" tooltip="Kategorie für Filter, Icon und Gruppierung in der Besucher-App." /><select title="Kategorie für Filter, Icon und Gruppierung in der Besucher-App." value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })} className="mt-2 w-full rounded-xl border p-3">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="block text-sm font-bold"><LabelText label="Kurzbeschreibung" tooltip="Ein kurzer Satz für Stationskarten und Listen." /><input title="Ein kurzer Satz für Stationskarten und Listen." value={draft.shortDescription} onChange={(event) => setDraft({ ...draft, shortDescription: event.target.value })} className="mt-2 w-full rounded-xl border p-3" /></label>
        <label className="block text-sm font-bold"><LabelText label="Beschreibung" tooltip={tooltipForLabel("Beschreibung")} /><textarea title={tooltipForLabel("Beschreibung")} rows={5} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="mt-2 w-full rounded-xl border p-3" /></label>
        <label className="block text-sm font-bold"><LabelText label="Öffnungszeiten" tooltip="Öffnungszeiten oder kurzer Hinweis, z. B. Heute 08:00–20:00 oder Durchgehend geöffnet." /><input title="Öffnungszeiten oder kurzer Hinweis, z. B. Heute 08:00–20:00 oder Durchgehend geöffnet." value={draft.openingHours} onChange={(event) => setDraft({ ...draft, openingHours: event.target.value })} className="mt-2 w-full rounded-xl border p-3" /></label>
        <label className="block text-sm font-bold"><LabelText label="Status" tooltip={tooltipForLabel("Status")} /><select title={tooltipForLabel("Status")} value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Station["status"] })} className="mt-2 w-full rounded-xl border p-3"><option value="open">Geöffnet</option><option value="closed">Geschlossen</option><option value="limited">Eingeschränkt</option><option value="maintenance">Nicht verfügbar</option></select></label>
        <label className="flex items-start gap-3 rounded-xl bg-[#f7f7f4] p-4 text-sm font-bold"><input title="Aktiviert diese Station für Besucher. Deaktiviert bleibt sie als Vorlage in der Verwaltung." type="checkbox" checked={!draft.isTemplate} onChange={(event) => setDraft({ ...draft, isTemplate: !event.target.checked })} className="mt-0.5 h-5 w-5 accent-[#286551]" /><span><span className="inline-flex items-center gap-1.5">In Besucher-App anzeigen<HelpBubble text="Aktiviert diese Station für Besucher. Deaktiviert bleibt sie als Vorlage in der Verwaltung." /></span><span className="mt-1 block font-normal leading-5 text-black/50">Standardstationen starten als Vorlage und werden erst nach Aktivierung öffentlich sichtbar.</span></span></label>
        <StationLocationPicker mapConfig={mapConfig} longitude={draft.longitude} latitude={draft.latitude} onChange={(position) => setDraft((current) => ({ ...current, ...position }))} />
      </div>
      <div className="mt-8 flex gap-3"><button type="button" onClick={onClose} className="flex-1 rounded-xl border px-4 py-3 font-bold">Abbrechen</button><button className="flex-1 rounded-xl bg-[#173c32] px-4 py-3 font-bold text-white">Speichern</button></div>
    </form>
  </div>;
}
