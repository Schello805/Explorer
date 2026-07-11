"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle2, Database, Eye, EyeOff, Mail, Plus, Server, ShieldCheck, Terminal, Users } from "lucide-react";
import type { Tenant } from "@/lib/types";

const platformLogo = "/icons/platzguide-logo.png";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export function PlatformAdminConsole({ adminEmail, tenants }: { adminEmail: string; tenants: Tenant[] }) {
  const [mailConfigured, setMailConfigured] = useState(false);
  return <main className="min-h-screen bg-[#f2f3ef] p-4 text-[#1b302a] sm:p-6">
    <section className="mx-auto w-full max-w-7xl">
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

      {tenants.length === 0 && <section className="mt-6 grid gap-6 rounded-[2rem] bg-white p-6 shadow-sm xl:grid-cols-[.9fr_1.1fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#286551]/70">Noch leer</p>
          <h2 className="mt-2 font-display text-4xl">Noch kein Campingplatz angelegt.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/55">Lege hier den ersten Mandanten an. Danach erscheint die normale Verwaltungsoberfläche mit Stationen, Branding, Rechtstexten, Analytics, Billing und Veröffentlichung.</p>
        </div>
        <CreateTenantForm />
      </section>}

      {tenants.length > 0 && <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#286551]/70">Mandanten bereit</p>
            <h2 className="mt-2 font-display text-4xl">Campingplätze verwalten.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-black/55">Öffne die normale Admin-Konsole, um Mandanten zu filtern, zu archivieren, zu reaktivieren oder zu löschen.</p>
          </div>
          <Link href="/admin" className="rounded-xl bg-[#173c32] px-5 py-3 text-sm font-bold text-white">Admin-Konsole öffnen</Link>
        </div>
      </section>}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <AdminCard title="Globale Einrichtung" icon={<Server />}>
          <ChecklistItem done label="Admin-Login aktiv" />
          <ChecklistItem done label="PostgreSQL angebunden" />
          <ChecklistItem done label="Mandantentrennung aktiv" />
          <ChecklistItem done={mailConfigured} label="SMTP konfiguriert" />
        </AdminCard>

        <AdminCard title="Admin-Werkzeuge" icon={<Terminal />}>
          <Command label="Live-Logs" command="journalctl -u platzguide -f" />
          <Command label="Status" command="systemctl status platzguide" />
          <Command label="Update" command="sudo RUN_VERIFY=false bash /opt/platzguide/scripts/update-ubuntu.sh" />
          <Command label="Healthcheck" command="curl -fsS http://127.0.0.1:3000/api/health" />
        </AdminCard>

        <MailSettingsCard onConfiguredChange={setMailConfigured} />

        <AdminCard title="Fehlerlogs & Auditlog" icon={<AlertTriangle />}>
          <p className="text-sm leading-6 text-black/55">Systemfehler liest du aktuell über `journalctl`. Mandanten-Auditlogs erscheinen, sobald mindestens ein Campingplatz existiert, in dessen Adminbereich. Der nächste sinnvolle Ausbauschritt wäre eine eigene Webansicht für Systemlogs und Auditlog-Filter.</p>
          <Link href="/api/health" target="_blank" className="inline-flex w-fit rounded-xl border border-black/10 px-4 py-3 text-sm font-bold">Healthcheck öffnen</Link>
        </AdminCard>
      </div>
    </section>
  </main>;
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
    window.setTimeout(() => window.location.assign("/admin"), 700);
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

  return <AdminCard title="SMTP & E-Mail" icon={<Mail />}>
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

function AdminCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-[1.5rem] bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><h2 className="font-display text-2xl">{title}</h2><span className="text-[#286551]">{icon}</span></div><div className="mt-4 space-y-3">{children}</div></section>;
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-black/5 p-3"><CheckCircle2 className={done ? "text-emerald-600" : "text-black/25"} size={19} /><p className="font-bold">{label}</p></div>;
}

function Command({ label, command }: { label: string; command: string }) {
  return <div className="rounded-xl bg-[#173c32] p-3 text-white"><p className="text-xs font-bold uppercase tracking-widest text-white/45">{label}</p><code className="mt-2 block break-all text-sm">{command}</code></div>;
}
