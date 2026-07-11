"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle2, Database, Eye, EyeOff, Mail, Plus, Server, ShieldCheck, Terminal, Users } from "lucide-react";
import type { AuditEntry, Tenant } from "@/lib/types";

const platformLogo = "/icons/platzguide-logo.png";
type PlatformAuditEntry = AuditEntry & { tenantName: string; tenantSlug?: string };

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
        <PlatformNavLink href="#einrichtung" label="Globale Einrichtung" icon={<Server size={18} />} />
        <PlatformNavLink href="#smtp" label="SMTP & E-Mail" icon={<Mail size={18} />} />
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
        <Metric icon={<Activity />} label="System" value="Online" note="App erreichbar" />
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
      </section>}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <AdminCard id="einrichtung" title="Globale Einrichtung" icon={<Server />}>
          <ChecklistItem done label="Admin-Login aktiv" />
          <ChecklistItem done label="PostgreSQL angebunden" />
          <ChecklistItem done label="Mandantentrennung aktiv" />
          <ChecklistItem done={mailConfigured} label="SMTP konfiguriert" />
        </AdminCard>

        <AdminCard id="werkzeuge" title="Admin-Werkzeuge" icon={<Terminal />}>
          <Command label="Live-Logs" command="journalctl -u platzguide -f" />
          <Command label="Status" command="systemctl status platzguide" />
          <Command label="Update" command="sudo RUN_VERIFY=false bash /opt/platzguide/scripts/update-ubuntu.sh" />
          <Command label="Healthcheck" command="curl -fsS http://127.0.0.1:3000/api/health" />
        </AdminCard>

        <MailSettingsCard onConfiguredChange={setMailConfigured} />

        <AdminCard id="logs" title="Systemlogs" icon={<AlertTriangle />}>
          <p className="text-sm leading-6 text-black/55">Live-Auszug aus dem Systemdienst. Falls der Server keinen Zugriff auf `journalctl` erlaubt, zeigt die Ansicht eine verständliche Meldung statt eines Absturzes.</p>
          <div className="flex flex-wrap gap-2"><button onClick={loadSystemLogs} className="rounded-xl border border-black/10 px-4 py-3 text-sm font-bold">Logs aktualisieren</button><button onClick={checkMonitoring} className="rounded-xl border border-black/10 px-4 py-3 text-sm font-bold">Monitoring prüfen</button><Link href="/api/health" target="_blank" className="rounded-xl border border-black/10 px-4 py-3 text-sm font-bold">Healthcheck öffnen</Link></div>
          {systemMessage && <p className="rounded-xl bg-[#f7f7f4] p-3 text-sm font-bold text-[#286551]">{systemMessage}</p>}
          <pre className="max-h-80 overflow-auto rounded-xl bg-[#101f1a] p-3 text-xs leading-5 text-white/80">{systemLogs.length ? systemLogs.join("\n") : "Noch keine Logs geladen."}</pre>
        </AdminCard>

        <AdminCard title="Upload-Cleanup" icon={<Database />}>
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
            <input type={showPassword ? "text" : "password"} value={config.smtpPassword} onChange={(event) => setConfig({ ...config, smtpPassword: event.target.value })} placeholder={config.hasSmtpPassword ? "Gespeichert · leer lassen zum Behalten" : "Passwort"} className="min-w-0 flex-1 rounded-xl px-3 py-3 outline-none" />
            <button title="Passwort anzeigen oder verbergen." type="button" onClick={() => setShowPassword((value) => !value)} className="px-3 text-[#286551]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </span>
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

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-black/5 p-3"><CheckCircle2 className={done ? "text-emerald-600" : "text-black/25"} size={19} /><p className="font-bold">{label}</p></div>;
}

function Command({ label, command }: { label: string; command: string }) {
  return <div className="rounded-xl bg-[#173c32] p-3 text-white"><p className="text-xs font-bold uppercase tracking-widest text-white/45">{label}</p><code className="mt-2 block break-all text-sm">{command}</code></div>;
}
