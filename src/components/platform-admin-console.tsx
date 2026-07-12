"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle2, Database, Eye, EyeOff, FileText, HardDrive, Mail, Plus, ShieldCheck, Terminal, Users } from "lucide-react";
import type { AuditEntry, Tenant } from "@/lib/types";

const platformLogo = "/icons/platzguide-logo.png";
type PlatformAuditEntry = AuditEntry & { tenantName: string; tenantSlug?: string };
type CaptchaProvider = "disabled" | "turnstile" | "hcaptcha" | "recaptcha";
const maskedSecretPlaceholder = "••••••••••••";
type ModuleId = "events" | "tours" | "checkins" | "rewards" | "guestGuide" | "feedback" | "push" | "occupancy";
type PlatformModule = { id: ModuleId; label: string; description: string };
type PlatformSettings = {
  availableFeatures: Record<ModuleId, boolean>;
  defaultFeatures: Record<ModuleId, boolean>;
  tenantAdminPermissions: { integrations: boolean; analytics: boolean; storage: boolean; backup: boolean };
  defaultIntegrations: Tenant["integrations"];
  defaultTracking: Tenant["tracking"];
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export function PlatformAdminConsole({ adminEmail, tenants }: { adminEmail: string; tenants: Tenant[] }) {
  const [mailConfigured, setMailConfigured] = useState(false);
  const auditEntries: PlatformAuditEntry[] = tenants.flatMap((tenant) => tenant.auditLog.map((entry) => ({ ...entry, tenantName: tenant.name, tenantSlug: tenant.slug }))).slice(0, 20);
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
    const payload = await response.json() as typeof cleanup;
    setCleanup(payload);
    setSystemMessage(`${payload.deleted} Upload-Dateien gelöscht.`);
  }

  async function checkMonitoring() {
    const response = await fetch("/api/admin/system/monitoring");
    const payload = await response.json().catch(() => null) as { ok?: boolean; error?: string; latencyMs?: number } | null;
    setSystemMessage(payload?.ok ? `Monitoring OK · ${payload.latencyMs ?? "?"} ms` : `Monitoring meldet Fehler: ${payload?.error ?? response.status}`);
  }

  return <div className="min-h-screen bg-[#f2f3ef] text-[#1b302a]">
    <aside className="border-b border-white/10 bg-[#173c32] p-4 text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-b-0">
      <a href="https://platzguide.de" className="flex min-w-0 items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/95 p-1.5 shadow-sm"><Image src={platformLogo} alt="Platzguide" width={40} height={40} className="h-full w-full object-contain" priority /></span>
        <div className="min-w-0"><p className="font-display text-xl">Platzguide</p><p className="text-[10px] uppercase tracking-widest text-white/45">Superadmin</p></div>
      </a>
      <nav className="mt-6 space-y-2">
        <PlatformNavLink href="#plattform" label="Übersicht" icon={<Activity size={18} />} />
        <PlatformNavLink href="#mandanten" label="Mandanten" icon={<Users size={18} />} />
        <PlatformNavLink href="#profil" label="Profil" icon={<ShieldCheck size={18} />} />
        <PlatformNavLink href="#smtp" label="SMTP & E-Mail" icon={<Mail size={18} />} />
        <PlatformNavLink href="#captcha" label="Captcha" icon={<ShieldCheck size={18} />} />
        <PlatformNavLink href="#vorgaben" label="Vorgaben" icon={<Database size={18} />} />
        <PlatformNavLink href="#recht" label="Rechtstexte" icon={<FileText size={18} />} />
        <PlatformNavLink href="#werkzeuge" label="Werkzeuge" icon={<Terminal size={18} />} />
        <PlatformNavLink href="#logs" label="Systemlogs" icon={<AlertTriangle size={18} />} />
        {tenants.length > 0
          ? <Link href="/admin/tenant" className="mt-5 flex items-center gap-3 rounded-xl bg-white px-3 py-3 text-sm font-bold text-[#173c32]"><Database size={18} />Mandantenverwaltung</Link>
          : <p className="mt-5 rounded-xl bg-white/5 px-3 py-3 text-xs font-bold leading-5 text-white/45">Mandantenverwaltung erscheint nach dem ersten Campingplatz.</p>}
      </nav>
      <div className="mt-8 rounded-xl bg-white/5 p-3 lg:absolute lg:bottom-4 lg:left-4 lg:right-4">
        <p className="truncate text-xs font-bold">{adminEmail}</p>
        <p className="mt-1 text-[10px] uppercase tracking-wider text-white/35">Zentraler Superadmin</p>
        <form action="/api/auth/logout" method="post"><button className="mt-3 text-xs font-bold text-[#e8b65f]">Sicher abmelden</button></form>
      </div>
    </aside>

    <main className="p-4 sm:p-6 lg:ml-64">
    <section id="plattform" className="mx-auto w-full max-w-7xl scroll-mt-6">
      <header className="flex flex-col gap-4 rounded-[2rem] bg-[#173c32] p-5 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <a href="https://platzguide.de" className="flex min-w-0 items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/95 p-1.5 shadow-sm"><Image src={platformLogo} alt="Platzguide" width={48} height={48} className="h-full w-full object-contain" priority /></span>
          <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.18em] text-white/45">Plattformverwaltung</p><h1 className="font-display text-3xl">Platzguide Admin</h1><p className="mt-1 truncate text-sm text-white/55">{adminEmail}</p></div>
        </a>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#173c32]">Startseite öffnen</Link>
          <form action="/api/auth/logout" method="post"><button className="rounded-xl border border-white/20 px-4 py-3 text-sm font-bold text-white">Abmelden</button></form>
        </div>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Users />} label="Mandanten" value={String(tenants.length)} note="Aktuell angelegt" />
        <Metric icon={<Database />} label="Datenbank" value="PostgreSQL" note="Produktionsbetrieb" />
        <Metric icon={<ShieldCheck />} label="RLS" value="Aktiv" note="Tenant-Isolierung" />
        <Metric icon={<Activity />} label="System" value={mailConfigured ? "Bereit" : "Prüfen"} note={mailConfigured ? "SMTP konfiguriert" : "SMTP fehlt oder lädt"} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <StatusTile ok label="PostgreSQL" note="Pflichtdatenbank aktiv" />
        <StatusTile ok={mailConfigured} label="SMTP" note={mailConfigured ? "Systemmails aktiv" : "SMTP speichern und Testmail senden"} />
        <StatusTile ok={tenants.length > 0} label="Mandanten" note={tenants.length > 0 ? "Mandantenverwaltung bereit" : "Ersten Campingplatz anlegen"} />
      </div>

      {tenants.length === 0 && <section id="mandanten" className="mt-6 grid scroll-mt-6 gap-6 rounded-[2rem] bg-white p-6 shadow-sm xl:grid-cols-[.9fr_1.1fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#286551]/70">Noch leer</p>
          <h2 className="mt-2 font-display text-4xl">Noch kein Campingplatz angelegt.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/55">Lege hier den ersten Mandanten an. Danach erscheint die normale Verwaltungsoberfläche mit Stationen, Branding, Rechtstexten, Analytics, Billing und Veröffentlichung.</p>
        </div>
        <CreateTenantForm />
      </section>}

      {tenants.length > 0 && <section id="mandanten" className="mt-6 scroll-mt-6 rounded-[2rem] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#286551]/70">Mandanten bereit</p>
            <h2 className="mt-2 font-display text-4xl">Campingplätze verwalten.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-black/55">Öffne die normale Admin-Konsole, um Mandanten zu filtern, zu archivieren, zu reaktivieren oder zu löschen.</p>
          </div>
          <Link href="/admin/tenant" className="rounded-xl bg-[#173c32] px-5 py-3 text-sm font-bold text-white">Mandantenverwaltung öffnen</Link>
        </div>
        <TenantOverview tenants={tenants} />
      </section>}

      <div className="mt-6 grid gap-6">
        <AdminCard id="werkzeuge" title="Admin-Werkzeuge" icon={<Terminal />}>
          <Command label="Live-Logs" command="journalctl -u platzguide -f" />
          <Command label="Status" command="systemctl status platzguide" />
          <Command label="Update" command="sudo RUN_VERIFY=false bash /opt/platzguide/scripts/update-ubuntu.sh" />
          <Command label="Healthcheck" command="curl -fsS http://127.0.0.1:3000/api/health" />
        </AdminCard>

        <PlatformAccountCard adminEmail={adminEmail} />

        <MailSettingsCard onConfiguredChange={setMailConfigured} />

        <CaptchaSettingsCard />

        <PlatformDefaultsCard />

        <LegalSettingsCard />

        <AdminCard id="logs" title="Systemlogs" icon={<AlertTriangle />}>
          <p className="text-sm leading-6 text-black/55">Live-Auszug aus dem Systemdienst. Falls der Server keinen Zugriff auf `journalctl` erlaubt, zeigt die Ansicht eine verständliche Meldung statt eines Absturzes.</p>
          <div className="flex flex-wrap gap-2"><button onClick={loadSystemLogs} className="rounded-xl border border-black/10 px-4 py-3 text-sm font-bold">Logs aktualisieren</button><button onClick={checkMonitoring} className="rounded-xl border border-black/10 px-4 py-3 text-sm font-bold">Monitoring prüfen</button><Link href="/api/health" target="_blank" className="rounded-xl border border-black/10 px-4 py-3 text-sm font-bold">Healthcheck öffnen</Link></div>
          {systemMessage && <p className="rounded-xl bg-[#f7f7f4] p-3 text-sm font-bold text-[#286551]">{systemMessage}</p>}
          <pre className="max-h-80 overflow-auto rounded-xl bg-[#101f1a] p-3 text-xs leading-5 text-white/80">{systemLogs.length ? systemLogs.join("\n") : "Noch keine Logs geladen."}</pre>
        </AdminCard>

        <AdminCard title="Upload-Cleanup" icon={<HardDrive />}>
          <p className="text-sm leading-6 text-black/55">Findet Upload-Dateien, die in keinem Mandanten mehr referenziert sind. Gelöscht wird erst nach Rückfrage.</p>
          <div className="rounded-xl bg-[#f7f7f4] p-4 text-sm">
            <p><strong>{cleanup?.candidates.length ?? 0}</strong> ungenutzte Dateien · {Math.round((cleanup?.reclaimableBytes ?? 0) / 1024 / 1024 * 10) / 10} MB freigebbar</p>
            <div className="mt-3 flex flex-wrap gap-2"><button onClick={previewCleanup} className="rounded-xl border border-black/10 px-4 py-3 text-sm font-bold">Erneut prüfen</button><button onClick={runCleanup} disabled={!cleanup?.candidates.length} className="rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">Ungenutzte löschen</button></div>
          </div>
          <div className="max-h-44 overflow-auto rounded-xl border border-black/10 p-3 text-xs text-black/55">{cleanup?.candidates.slice(0, 20).map((item) => <p key={item.url} className="break-all">{item.url}</p>) || "Keine Kandidaten."}</div>
        </AdminCard>

        <AdminCard title="Auditlog" icon={<ShieldCheck />}>
          <p className="text-sm leading-6 text-black/55">Mandantenübergreifende Übersicht der letzten protokollierten Änderungen.</p>
          <button onClick={loadAudit} className="rounded-xl border border-black/10 px-4 py-3 text-sm font-bold">Auditlog aktualisieren</button>
          {auditLines.length === 0 && <p className="rounded-xl bg-[#f7f7f4] p-4 text-sm text-black/55">Noch keine Audit-Einträge vorhanden.</p>}
          <div className="space-y-2">{auditLines.map((entry) => <div key={`${entry.id}-${entry.createdAt}`} className="rounded-xl border border-black/10 p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><p className="font-bold">{entry.action}</p><p className="text-xs text-black/45">{formatPlatformDate(entry.createdAt)}</p></div>
            <p className="mt-1 text-xs text-black/55">{entry.tenantName} · {entry.entityType} · {entry.actorEmail}</p>
          </div>)}</div>
        </AdminCard>
      </div>
    </section>
    </main>
  </div>;
}

function PlatformAccountCard({ adminEmail }: { adminEmail: string }) {
  const [email, setEmail] = useState(adminEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [state, setState] = useState({ loading: false, message: "", error: "" });

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ loading: true, message: "", error: "" });
    const response = await fetch("/api/admin/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, currentPassword, newPassword })
    });
    const payload = await response.json().catch(() => null) as { error?: string; email?: string } | null;
    if (!response.ok) {
      setState({ loading: false, message: "", error: payload?.error ?? "Profil konnte nicht gespeichert werden." });
      return;
    }
    setEmail(payload?.email ?? email);
    setCurrentPassword("");
    setNewPassword("");
    setState({ loading: false, message: "Profil gespeichert. Deine Session wurde aktualisiert.", error: "" });
  }

  return <AdminCard id="profil" title="Profil & Zugang" icon={<ShieldCheck />}>
    <p className="text-sm leading-6 text-black/55">Diese Zugangsdaten gelten nur für den zentralen Superadmin. Änderungen werden in `.env.local` gespeichert und die aktuelle Session wird sofort erneuert.</p>
    <form onSubmit={saveAccount} className="space-y-3">
      <MailInput label="Login-E-Mail" type="email" value={email} onChange={setEmail} required />
      <label className="text-sm font-bold">Aktuelles Passwort
        <span className="mt-1 flex rounded-xl border border-black/10 bg-white">
          <input type={showPasswords ? "text" : "password"} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="min-w-0 flex-1 rounded-xl px-3 py-3 outline-none" required minLength={8} />
          <button title="Passwörter anzeigen oder verbergen." type="button" onClick={() => setShowPasswords((value) => !value)} className="px-3 text-[#286551]">{showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </span>
      </label>
      <MailInput label="Neues Passwort" type={showPasswords ? "text" : "password"} value={newPassword} onChange={setNewPassword} placeholder="Leer lassen = Passwort behalten" />
      <button disabled={state.loading} className="rounded-xl bg-[#173c32] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{state.loading ? "Speichert …" : "Profil speichern"}</button>
      {state.message && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{state.message}</p>}
      {state.error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{state.error}</p>}
    </form>
  </AdminCard>;
}

function StatusTile({ ok, label, note }: { ok: boolean; label: string; note: string }) {
  return <article className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm">
    <span className={ok ? "text-emerald-600" : "text-amber-600"}>{ok ? <CheckCircle2 /> : <AlertTriangle />}</span>
    <div className="min-w-0"><p className="font-bold">{label}</p><p className="mt-1 text-sm leading-5 text-black/50">{note}</p></div>
  </article>;
}

function TenantOverview({ tenants }: { tenants: Tenant[] }) {
  const activeCount = tenants.filter((tenant) => tenant.billing.status === "active" && tenant.billing.publicEnabled && !tenant.archivedAt).length;
  const blockedCount = tenants.filter((tenant) => tenant.archivedAt || tenant.billing.status === "blocked").length;
  const usedMb = tenants.reduce((sum, tenant) => sum + tenant.media.reduce((mediaSum, asset) => mediaSum + (asset.sizeBytes ?? 0), 0), 0) / 1024 / 1024;
  return <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_1fr]">
    <div className="rounded-2xl bg-[#f7f7f4] p-4"><p className="text-xs font-bold uppercase tracking-widest text-black/35">Öffentlich</p><p className="mt-2 font-display text-3xl">{activeCount}</p><p className="text-sm text-black/50">freigeschaltete Plätze</p></div>
    <div className="rounded-2xl bg-[#f7f7f4] p-4"><p className="text-xs font-bold uppercase tracking-widest text-black/35">Gesperrt</p><p className="mt-2 font-display text-3xl">{blockedCount}</p><p className="text-sm text-black/50">archiviert oder blockiert</p></div>
    <div className="rounded-2xl bg-[#f7f7f4] p-4"><p className="text-xs font-bold uppercase tracking-widest text-black/35">Uploads</p><p className="mt-2 font-display text-3xl">{Math.round(usedMb * 10) / 10} MB</p><p className="text-sm text-black/50">tenantübergreifend referenziert</p></div>
    <div className="lg:col-span-3 overflow-x-auto rounded-2xl border border-black/10">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-[#fafaf8] text-xs uppercase tracking-wider text-black/40"><tr><th className="px-4 py-3">Campingplatz</th><th>Link</th><th>Paket</th><th>Status</th><th>Speicher</th><th className="px-4 text-right">Aktion</th></tr></thead>
        <tbody>{tenants.map((tenant) => <tr key={tenant.id} className="border-t border-black/5">
          <td className="px-4 py-3 font-bold">{tenant.name}</td>
          <td className="text-black/55">/c/{tenant.slug}</td>
          <td>{tenant.billing.plan === "pro" ? "Pro" : "Starter"}</td>
          <td><span className={tenant.archivedAt || tenant.billing.status === "blocked" ? "rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700" : tenant.billing.status === "active" ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700" : "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700"}>{tenant.archivedAt ? "Archiviert" : tenant.billing.status}</span></td>
          <td>{Math.round(tenant.media.reduce((sum, asset) => sum + (asset.sizeBytes ?? 0), 0) / 1024 / 1024 * 10) / 10} / {tenant.billing.storageLimitMb} MB</td>
          <td className="px-4 text-right"><Link href={`/admin/tenant?tenant=${tenant.slug}`} className="font-bold text-[#286551]">Öffnen</Link></td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}

type PlatformLegal = {
  imprint: string;
  privacy: string;
  cookies: string;
  terms: string;
};

function LegalSettingsCard() {
  const [legal, setLegal] = useState<PlatformLegal>({ imprint: "", privacy: "", cookies: "", terms: "" });
  const [state, setState] = useState({ loading: true, message: "", error: "" });

  useEffect(() => {
    fetch("/api/admin/system/legal")
      .then((response) => response.ok ? response.json() : null)
      .then((payload: PlatformLegal | null) => {
        if (payload) setLegal(payload);
        setState({ loading: false, message: "", error: "" });
      })
      .catch(() => setState({ loading: false, message: "", error: "Rechtstexte konnten nicht geladen werden." }));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ loading: true, message: "", error: "" });
    const response = await fetch("/api/admin/system/legal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(legal)
    });
    setState({ loading: false, message: response.ok ? "Zentrale Rechtstexte gespeichert." : "", error: response.ok ? "" : "Rechtstexte konnten nicht gespeichert werden." });
  }

  return <AdminCard id="recht" title="Zentrale Rechtstexte" icon={<FileText />}>
    <p className="text-sm leading-6 text-black/55">Diese Texte gelten für die Hauptdomain und alle Campingplatz-Links. Mandantenadmins pflegen keine eigenen Rechtstexte.</p>
    <form onSubmit={save} className="space-y-3">
      <LegalTextarea label="Impressum" value={legal.imprint} onChange={(imprint) => setLegal({ ...legal, imprint })} />
      <LegalTextarea label="Datenschutz" value={legal.privacy} onChange={(privacy) => setLegal({ ...legal, privacy })} />
      <LegalTextarea label="Cookie-Hinweise" value={legal.cookies} onChange={(cookies) => setLegal({ ...legal, cookies })} />
      <LegalTextarea label="AGB / Nutzungsbedingungen" value={legal.terms} onChange={(terms) => setLegal({ ...legal, terms })} />
      <div className="flex flex-wrap gap-2">
        <button disabled={state.loading} className="rounded-xl bg-[#173c32] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{state.loading ? "Speichert …" : "Rechtstexte speichern"}</button>
        <Link href="/rechtliches/impressum" target="_blank" className="rounded-xl border border-black/10 px-5 py-3 text-sm font-bold">Vorschau öffnen</Link>
      </div>
      {state.message && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{state.message}</p>}
      {state.error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{state.error}</p>}
    </form>
  </AdminCard>;
}

function PlatformDefaultsCard() {
  const [modules, setModules] = useState<PlatformModule[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [state, setState] = useState({ loading: true, message: "", error: "" });

  useEffect(() => {
    fetch("/api/admin/system/platform-settings")
      .then((response) => response.ok ? response.json() : null)
      .then((payload: { settings: PlatformSettings; modules: PlatformModule[] } | null) => {
        if (payload) {
          setSettings(payload.settings);
          setModules(payload.modules);
        }
        setState({ loading: false, message: "", error: "" });
      })
      .catch(() => setState({ loading: false, message: "", error: "Plattformvorgaben konnten nicht geladen werden." }));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;
    setState({ loading: true, message: "", error: "" });
    const response = await fetch("/api/admin/system/platform-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });
    setState({ loading: false, message: response.ok ? "Plattformvorgaben gespeichert. Neue Mandanten nutzen diese Werte." : "", error: response.ok ? "" : "Plattformvorgaben konnten nicht gespeichert werden." });
  }

  if (!settings) return <AdminCard id="vorgaben" title="Modul- & Integrations-Vorgaben" icon={<Database />}><p className="text-sm text-black/55">{state.loading ? "Lade Vorgaben …" : state.error}</p></AdminCard>;

  return <AdminCard id="vorgaben" title="Modul- & Integrations-Vorgaben" icon={<Database />}>
    <p className="text-sm leading-6 text-black/55">Diese Vorgaben gelten für neu angelegte Campingplätze. Bestehende Mandanten bleiben bewusst unverändert und können von dir einzeln in der Mandantenverwaltung angepasst werden.</p>
    <form onSubmit={save} className="space-y-5">
      <div className="grid gap-3 lg:grid-cols-2">
        {modules.map((module) => <article key={module.id} className="rounded-xl border border-black/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><p className="font-bold">{module.label}</p><p className="mt-1 text-xs leading-5 text-black/50">{module.description}</p></div>
            <label className="shrink-0 text-xs font-bold text-black/45">Verfügbar<br /><input type="checkbox" checked={settings.availableFeatures[module.id]} onChange={(event) => setSettings({ ...settings, availableFeatures: { ...settings.availableFeatures, [module.id]: event.target.checked }, defaultFeatures: { ...settings.defaultFeatures, [module.id]: event.target.checked ? settings.defaultFeatures[module.id] : false } })} className="mt-2 h-5 w-5 accent-[#286551]" /></label>
          </div>
          <label className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-[#f7f7f4] p-3 text-sm font-bold">
            <span>Bei neuen Mandanten aktiv</span>
            <input type="checkbox" disabled={!settings.availableFeatures[module.id]} checked={settings.defaultFeatures[module.id]} onChange={(event) => setSettings({ ...settings, defaultFeatures: { ...settings.defaultFeatures, [module.id]: event.target.checked } })} className="h-5 w-5 accent-[#286551] disabled:opacity-40" />
          </label>
        </article>)}
      </div>

      <div className="rounded-2xl bg-[#f7f7f4] p-4">
        <h3 className="font-display text-2xl">Mandantenadmin-Rechte</h3>
        <p className="mt-1 text-sm leading-6 text-black/55">Hier legst du fest, ob Betreiber eigene Integrationsbereiche sehen dürfen. SMTP bleibt immer global und ist nie mandantenänderbar.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            ["integrations", "Integrationen-Menü sichtbar"],
            ["analytics", "Analytics/Matomo änderbar"],
            ["storage", "Upload-Regeln änderbar"],
            ["backup", "Backup-Hinweise sichtbar"]
          ].map(([key, label]) => <label key={key} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm font-bold">
            <span>{label}</span>
            <input type="checkbox" checked={settings.tenantAdminPermissions[key as keyof PlatformSettings["tenantAdminPermissions"]]} onChange={(event) => setSettings({ ...settings, tenantAdminPermissions: { ...settings.tenantAdminPermissions, [key]: event.target.checked } })} className="h-5 w-5 accent-[#286551]" />
          </label>)}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/10 p-4">
          <h3 className="font-display text-2xl">Analytics-Default</h3>
          <label className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#f7f7f4] p-3 text-sm font-bold"><span>Matomo standardmäßig aktiv</span><input type="checkbox" checked={settings.defaultTracking.enabled} onChange={(event) => setSettings({ ...settings, defaultTracking: { ...settings.defaultTracking, enabled: event.target.checked, provider: event.target.checked ? "matomo" : "none" } })} className="h-5 w-5 accent-[#286551]" /></label>
          <MailInput label="Matomo-URL" value={settings.defaultTracking.matomoUrl} onChange={(matomoUrl) => setSettings({ ...settings, defaultTracking: { ...settings.defaultTracking, matomoUrl } })} />
          <MailInput label="Matomo-Site-ID" value={settings.defaultTracking.matomoSiteId} onChange={(matomoSiteId) => setSettings({ ...settings, defaultTracking: { ...settings.defaultTracking, matomoSiteId, measurementId: matomoSiteId } })} />
        </div>
        <div className="rounded-2xl border border-black/10 p-4">
          <h3 className="font-display text-2xl">Upload & Backup-Default</h3>
          <MailInput label="Max. Upload MB" type="number" value={String(settings.defaultIntegrations.storage.maxUploadMb)} onChange={(maxUploadMb) => setSettings({ ...settings, defaultIntegrations: { ...settings.defaultIntegrations, storage: { ...settings.defaultIntegrations.storage, maxUploadMb: Number(maxUploadMb) } } })} />
          <label className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#f7f7f4] p-3 text-sm font-bold"><span>Backups für neue Mandanten markieren</span><input type="checkbox" checked={settings.defaultIntegrations.backup.enabled} onChange={(event) => setSettings({ ...settings, defaultIntegrations: { ...settings.defaultIntegrations, backup: { ...settings.defaultIntegrations.backup, enabled: event.target.checked } } })} className="h-5 w-5 accent-[#286551]" /></label>
          <MailInput label="Backup-Zeitplan" value={settings.defaultIntegrations.backup.schedule} onChange={(schedule) => setSettings({ ...settings, defaultIntegrations: { ...settings.defaultIntegrations, backup: { ...settings.defaultIntegrations.backup, schedule } } })} />
        </div>
      </div>

      <button disabled={state.loading} className="rounded-xl bg-[#173c32] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{state.loading ? "Speichert …" : "Vorgaben speichern"}</button>
      {state.message && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{state.message}</p>}
      {state.error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{state.error}</p>}
    </form>
  </AdminCard>;
}

function LegalTextarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-bold">{label}
    <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={8} className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-3 font-normal leading-6" />
  </label>;
}

type CaptchaConfig = {
  provider: CaptchaProvider;
  siteKey: string;
  turnstileSecretKey: string;
  hcaptchaSecretKey: string;
  recaptchaSecretKey: string;
  hasTurnstileSecretKey: boolean;
  hasHcaptchaSecretKey: boolean;
  hasRecaptchaSecretKey: boolean;
  allowPublicSignup: boolean;
};

function CaptchaSettingsCard() {
  const [config, setConfig] = useState<CaptchaConfig>({
    provider: "disabled",
    siteKey: "",
    turnstileSecretKey: "",
    hcaptchaSecretKey: "",
    recaptchaSecretKey: "",
    hasTurnstileSecretKey: false,
    hasHcaptchaSecretKey: false,
    hasRecaptchaSecretKey: false,
    allowPublicSignup: false
  });
  const [showSecrets, setShowSecrets] = useState(false);
  const [state, setState] = useState({ loading: false, message: "", error: "" });

  useEffect(() => {
    fetch("/api/admin/system/captcha-config")
      .then((response) => response.ok ? response.json() : null)
      .then((payload: Omit<CaptchaConfig, "turnstileSecretKey" | "hcaptchaSecretKey" | "recaptchaSecretKey"> | null) => {
        if (!payload) return;
        setConfig({ ...payload, turnstileSecretKey: "", hcaptchaSecretKey: "", recaptchaSecretKey: "" });
      })
      .catch(() => undefined);
  }, []);

  async function saveCaptcha(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ loading: true, message: "", error: "" });
    const response = await fetch("/api/admin/system/captcha-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
    if (!response.ok) {
      setState({ loading: false, message: "", error: "Captcha-Konfiguration konnte nicht gespeichert werden." });
      return;
    }
    setConfig((current) => ({
      ...current,
      hasTurnstileSecretKey: current.hasTurnstileSecretKey || Boolean(current.turnstileSecretKey),
      hasHcaptchaSecretKey: current.hasHcaptchaSecretKey || Boolean(current.hcaptchaSecretKey),
      hasRecaptchaSecretKey: current.hasRecaptchaSecretKey || Boolean(current.recaptchaSecretKey),
      turnstileSecretKey: "",
      hcaptchaSecretKey: "",
      recaptchaSecretKey: ""
    }));
    setState({ loading: false, message: "Captcha-Konfiguration gespeichert.", error: "" });
  }

  const secretLabel = config.provider === "recaptcha"
    ? "Google reCAPTCHA Secret-Key"
    : config.provider === "turnstile"
      ? "Turnstile Secret-Key"
      : config.provider === "hcaptcha"
        ? "hCaptcha Secret-Key"
        : "Secret-Key";
  const secretValue = config.provider === "recaptcha" ? config.recaptchaSecretKey : config.provider === "turnstile" ? config.turnstileSecretKey : config.hcaptchaSecretKey;
  const hasSecret = config.provider === "recaptcha" ? config.hasRecaptchaSecretKey : config.provider === "turnstile" ? config.hasTurnstileSecretKey : config.hasHcaptchaSecretKey;

  function updateSecret(value: string) {
    if (config.provider === "recaptcha") setConfig({ ...config, recaptchaSecretKey: value });
    else if (config.provider === "turnstile") setConfig({ ...config, turnstileSecretKey: value });
    else setConfig({ ...config, hcaptchaSecretKey: value });
  }

  return <AdminCard id="captcha" title="Captcha & Registrierung" icon={<ShieldCheck />}>
    <p className="text-sm leading-6 text-black/55">Diese Werte gelten global für die Konto- und Campingplatz-Erstellung auf der Startseite. Für Google nutzt du reCAPTCHA v2 Checkbox mit Domain `platzguide.de`.</p>
    <form onSubmit={saveCaptcha} className="space-y-3">
      <label className="text-sm font-bold">Captcha-Anbieter
        <select value={config.provider} onChange={(event) => setConfig({ ...config, provider: event.target.value as CaptchaProvider })} className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-3">
          <option value="disabled">Deaktiviert</option>
          <option value="recaptcha">Google reCAPTCHA v2 Checkbox</option>
          <option value="turnstile">Cloudflare Turnstile</option>
          <option value="hcaptcha">hCaptcha</option>
        </select>
      </label>
      <MailInput label="Öffentlicher Site-Key" value={config.siteKey} onChange={(siteKey) => setConfig({ ...config, siteKey })} placeholder="Site-Key aus der Anbieter-Konsole" />
      {config.provider !== "disabled" && <label className="text-sm font-bold">{secretLabel}
        <span className="mt-1 flex rounded-xl border border-black/10 bg-white">
          <input type={showSecrets ? "text" : "password"} value={secretValue} onChange={(event) => updateSecret(event.target.value)} placeholder={hasSecret ? maskedSecretPlaceholder : "Secret-Key"} autoComplete="new-password" className="min-w-0 flex-1 rounded-xl px-3 py-3 outline-none" />
          <button title="Secret anzeigen oder verbergen." type="button" onClick={() => setShowSecrets((value) => !value)} className="px-3 text-[#286551]">{showSecrets ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </span>
        {hasSecret && !secretValue && <span className="mt-1 block text-xs font-normal text-black/45">Gespeichert. Nur ausfüllen, wenn du den Secret-Key ändern möchtest.</span>}
      </label>}
      <label className="flex items-center justify-between gap-4 rounded-xl border border-black/10 p-3 text-sm font-bold">
        <span>Öffentliche Registrierung aktivieren</span>
        <input type="checkbox" checked={config.allowPublicSignup} onChange={(event) => setConfig({ ...config, allowPublicSignup: event.target.checked })} className="h-5 w-5 accent-[#286551]" />
      </label>
      <button disabled={state.loading} className="rounded-xl bg-[#173c32] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{state.loading ? "Speichert …" : "Captcha speichern"}</button>
      {state.message && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{state.message}</p>}
      {state.error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{state.error}</p>}
    </form>
  </AdminCard>;
}

function formatPlatformDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function PlatformNavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return <a href={href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white">{icon}{label}</a>;
}

export function CreateTenantForm({ compact = false }: { compact?: boolean }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<{ loading: boolean; error: string; success: string }>({ loading: false, error: "", success: "" });
  const suggestedSlug = useMemo(() => slugify(name), [name]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ loading: true, error: "", success: "" });
    const response = await fetch("/api/admin/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: slug || suggestedSlug, ownerEmail, ownerPassword })
    });
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) {
      setState({ loading: false, error: payload?.error ?? "Der Campingplatz konnte nicht angelegt werden.", success: "" });
      return;
    }
    setState({ loading: false, error: "", success: "Campingplatz angelegt. Admin wird neu geladen …" });
    window.setTimeout(() => window.location.assign("/admin/tenant"), 700);
  }

  return <form onSubmit={submit} className={compact ? "space-y-3" : "rounded-2xl bg-[#f7f7f4] p-4"}>
    <div className="flex items-center gap-2"><Plus size={18} className="text-[#286551]" /><h3 className="font-display text-2xl">Campingplatz anlegen</h3></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-bold">Name
        <input title="Offizieller Name des Campingplatzes, wie er in Header, E-Mails und Besucher-App erscheint." value={name} onChange={(event) => { const nextName = event.target.value; setName(nextName); if (!slug) setSlug(slugify(nextName)); }} placeholder="Camping Sonnental" className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-3" required />
      </label>
      <label className="text-sm font-bold">Link-Kürzel
        <input title="Einmalige URL nach der Hauptdomain, z. B. platzguide.de/c/sonnental. Nur Kleinbuchstaben, Zahlen und Bindestriche." value={slug || suggestedSlug} onChange={(event) => setSlug(event.target.value.toLowerCase())} placeholder="sonnental" className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-3" required pattern="[a-z0-9-]{2,80}" />
      </label>
      <label className="text-sm font-bold">Verwalter-E-Mail
        <input title="Diese E-Mail bekommt den Mandanten-Zugang und kann den Campingplatz verwalten." type="email" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} placeholder="verwaltung@camping.de" className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-3" required />
      </label>
      <label className="text-sm font-bold">Start-Passwort
        <span className="mt-1 flex rounded-xl border border-black/10 bg-white">
          <input title="Mindestens 12 Zeichen. Der Verwalter kann sich damit direkt anmelden; die E-Mail gilt bei Admin-Anlage als bestätigt." type={showPassword ? "text" : "password"} value={ownerPassword} onChange={(event) => setOwnerPassword(event.target.value)} placeholder="mind. 12 Zeichen" className="min-w-0 flex-1 rounded-xl px-3 py-3 outline-none" required minLength={12} />
          <button title="Passwort anzeigen oder verbergen." type="button" onClick={() => setShowPassword((value) => !value)} className="px-3 text-[#286551]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </span>
      </label>
    </div>
    <button disabled={state.loading} className="mt-4 rounded-xl bg-[#173c32] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{state.loading ? "Wird angelegt …" : "Campingplatz anlegen"}</button>
    {state.error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{state.error}</p>}
    {state.success && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{state.success}</p>}
  </form>;
}

type MailConfig = {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  hasSmtpPassword: boolean;
  mailFrom: string;
  mailFromName: string;
  mailLogoUrl: string;
  configured: boolean;
};

function MailSettingsCard({ onConfiguredChange }: { onConfiguredChange: (configured: boolean) => void }) {
  const [config, setConfig] = useState<MailConfig>({
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: "",
    smtpPassword: "",
    hasSmtpPassword: false,
    mailFrom: "noreply@platzguide.de",
    mailFromName: "Platzguide",
    mailLogoUrl: "",
    configured: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState({ loading: false, testing: false, message: "", error: "" });

  useEffect(() => {
    fetch("/api/admin/system/mail-config")
      .then((response) => response.ok ? response.json() : null)
      .then((payload: Omit<MailConfig, "smtpPassword"> | null) => {
        if (!payload) return;
        setConfig({ ...payload, smtpPassword: "" });
        onConfiguredChange(payload.configured);
      })
      .catch(() => undefined);
  }, [onConfiguredChange]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ loading: true, testing: false, message: "", error: "" });
    const response = await fetch("/api/admin/system/mail-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
    setState({ loading: false, testing: false, message: response.ok ? "SMTP-Konfiguration gespeichert." : "", error: response.ok ? "" : "SMTP-Konfiguration konnte nicht gespeichert werden." });
    if (response.ok) {
      setConfig((current) => ({ ...current, smtpPassword: "", hasSmtpPassword: current.hasSmtpPassword || Boolean(current.smtpPassword), configured: Boolean(current.smtpHost && current.mailFrom) }));
      onConfiguredChange(Boolean(config.smtpHost && config.mailFrom));
    }
  }

  async function sendTestMail() {
    setState({ loading: false, testing: true, message: "", error: "" });
    const response = await fetch("/api/admin/system/mail-config", { method: "PUT" });
    setState({ loading: false, testing: false, message: response.ok ? "Testmail wurde an deinen Superadmin-Zugang gesendet." : "", error: response.ok ? "" : "Testmail fehlgeschlagen. Bitte SMTP-Daten prüfen." });
  }

  return <AdminCard id="smtp" title="SMTP & E-Mail" icon={<Mail />}>
    <p className="text-sm leading-6 text-black/55">Diese Einstellungen gelten zentral für die ganze Plattform. Absender, Name und SMTP-Zugang werden hier gespeichert; Mandanten können diese Werte nicht ändern.</p>
    <p className="rounded-xl bg-[#f7f7f4] p-3 text-xs leading-5 text-black/55">Systemmails gehen an Mandantenadmins oder an dich als Superadmin. Gäste erhalten keine E-Mails.</p>
    <form onSubmit={save} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <MailInput label="SMTP Host" value={config.smtpHost} onChange={(smtpHost) => setConfig({ ...config, smtpHost })} placeholder="smtp.example.de" required />
        <MailInput label="SMTP Port" type="number" value={String(config.smtpPort)} onChange={(smtpPort) => setConfig({ ...config, smtpPort: Number(smtpPort) })} required />
        <MailInput label="SMTP Benutzer" value={config.smtpUser} onChange={(smtpUser) => setConfig({ ...config, smtpUser })} placeholder="user@example.de" />
        <label className="text-sm font-bold">SMTP Passwort
          <span className="mt-1 flex rounded-xl border border-black/10 bg-white">
            <input type={showPassword ? "text" : "password"} value={config.smtpPassword} onChange={(event) => setConfig({ ...config, smtpPassword: event.target.value })} placeholder={config.hasSmtpPassword ? maskedSecretPlaceholder : "Passwort"} autoComplete="new-password" className="min-w-0 flex-1 rounded-xl px-3 py-3 outline-none" />
            <button title="Passwort anzeigen oder verbergen." type="button" onClick={() => setShowPassword((value) => !value)} className="px-3 text-[#286551]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </span>
          {config.hasSmtpPassword && !config.smtpPassword && <span className="mt-1 block text-xs font-normal text-black/45">Gespeichert. Nur ausfüllen, wenn du das Passwort ändern möchtest.</span>}
        </label>
        <MailInput label="Absender E-Mail" type="email" value={config.mailFrom} onChange={(mailFrom) => setConfig({ ...config, mailFrom })} required />
        <MailInput label="Absender Name" value={config.mailFromName} onChange={(mailFromName) => setConfig({ ...config, mailFromName })} required />
      </div>
      <MailInput label="Logo-URL für Mails" value={config.mailLogoUrl} onChange={(mailLogoUrl) => setConfig({ ...config, mailLogoUrl })} placeholder="https://platzguide.de/icons/platzguide-logo.png" />
      <label className="flex items-center justify-between gap-4 rounded-xl border border-black/10 p-3 text-sm font-bold">
        <span>SSL/TLS direkt verwenden</span>
        <input type="checkbox" checked={config.smtpSecure} onChange={(event) => setConfig({ ...config, smtpSecure: event.target.checked, smtpPort: event.target.checked ? 465 : config.smtpPort })} className="h-5 w-5 accent-[#286551]" />
      </label>
      <div className="flex flex-wrap gap-2">
        <button disabled={state.loading} className="rounded-xl bg-[#173c32] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{state.loading ? "Speichert …" : "SMTP speichern"}</button>
        <button type="button" disabled={state.testing || !config.configured && !config.smtpHost} onClick={sendTestMail} className="rounded-xl border border-black/10 px-5 py-3 text-sm font-bold disabled:opacity-50">{state.testing ? "Sendet …" : "Testmail senden"}</button>
      </div>
      {state.message && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{state.message}</p>}
      {state.error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{state.error}</p>}
    </form>
  </AdminCard>;
}

function MailInput({ label, value, onChange, type = "text", placeholder, required }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return <label className="text-sm font-bold">{label}
    <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-3" />
  </label>;
}

function Metric({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return <article className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex justify-between text-[#286551]"><p className="text-xs font-bold uppercase tracking-widest text-[#1b302a]/40">{label}</p>{icon}</div><p className="mt-4 font-display text-4xl">{value}</p><p className="mt-1 text-xs text-[#1b302a]/45">{note}</p></article>;
}

function AdminCard({ id, title, icon, children }: { id?: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-6 rounded-[1.5rem] bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><h2 className="font-display text-2xl">{title}</h2><span className="text-[#286551]">{icon}</span></div><div className="mt-4 space-y-3">{children}</div></section>;
}

function Command({ label, command }: { label: string; command: string }) {
  return <div className="rounded-xl bg-[#173c32] p-3 text-white"><p className="text-xs font-bold uppercase tracking-widest text-white/45">{label}</p><code className="mt-2 block break-all text-sm">{command}</code></div>;
}
