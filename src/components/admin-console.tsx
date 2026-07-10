"use client";

import { useState } from "react";
import Image from "next/image";
import { Activity, Bell, BookOpen, CalendarDays, Caravan, ChevronRight, CircleAlert, Download, FileText, Gift, Globe2, ImageIcon, LayoutDashboard, MapPinned, Menu, MessageSquareWarning, Palette, Plus, Search, Settings, ShieldCheck, Trash2, Users, X } from "lucide-react";
import type { Category, EventItem, GuestGuideItem, MediaAsset, Reward, Station, Tenant, Tour } from "@/lib/types";
import { cn, statusLabel } from "@/lib/utils";
import { StationLocationPicker } from "@/components/station-location-picker";
import { StationImport } from "@/components/station-import";

const platformLogo = "/icons/platzguide-logo.png";

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

  async function importStations(importedStations: Station[]) {
    for (const station of importedStations) await persistStation(station);
  }

  return <div className="min-h-screen overflow-x-hidden bg-[#f2f3ef] text-[#1b302a]">
    {menuOpen && <button aria-label="Menü schließen" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-20 bg-black/35 lg:hidden" />}
    <aside className={cn("fixed inset-y-0 left-0 z-30 flex w-60 flex-col overflow-y-auto overflow-x-hidden bg-[#173c32] p-4 text-white transition-transform lg:translate-x-0", menuOpen ? "translate-x-0" : "-translate-x-full")}>
      <div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl bg-white/95 p-1.5 shadow-sm"><Image src={platformLogo} alt="Platzguide" width={40} height={40} className="h-full w-full object-contain" priority /></span><div><p className="font-display text-xl">Platzguide</p><p className="text-[10px] uppercase tracking-widest text-white/45">Plattform Admin</p></div></div><button className="lg:hidden" onClick={() => setMenuOpen(false)}><X /></button></div>
      <nav className="mt-6 space-y-1">{navigation.map((item) => <button key={item.id} onClick={() => { setSection(item.id); setMenuOpen(false); }} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold transition", section === item.id ? "bg-white text-[#173c32]" : "text-white/65 hover:bg-white/10 hover:text-white")}><item.icon size={18} />{item.label}</button>)}</nav>
      <div className="mt-auto shrink-0 rounded-xl bg-white/5 p-3"><p className="truncate text-xs font-bold">{adminEmail}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-white/35">Plattform-Administrator</p><form action="/api/auth/logout" method="post"><button className="mt-3 text-xs text-[#e8b65f]">Sicher abmelden</button></form></div>
    </aside>

    <main className="min-w-0 overflow-x-hidden lg:ml-60">
      <header className="sticky top-0 z-20 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-[#f2f3ef]/90 px-[5%] py-2 backdrop-blur-xl">
        <button aria-label="Menü öffnen" className="shrink-0 lg:hidden" onClick={() => setMenuOpen(true)}><Menu /></button><div className="hidden min-w-0 sm:block"><p className="text-xs font-bold uppercase tracking-widest text-[#1b302a]/40">Plattformverwaltung</p><h1 className="truncate font-display text-2xl">{navigation.find((item) => item.id === section)?.label}</h1></div><div className="flex min-w-0 flex-1 justify-end gap-2"><select aria-label="Mandant wählen" value={currentTenant.id} onChange={(event) => { const nextTenant = availableTenants.find((item) => item.id === event.target.value); if (!nextTenant) return; setCurrentTenant(nextTenant); setStations(nextTenant.stations); setEditing(null); }} className="min-w-0 max-w-[46vw] rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-bold"><option value="" disabled>Mandant wählen</option>{availableTenants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><a href="/" target="_blank" className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-bold"><Globe2 size={16} className="sm:mr-2 sm:inline" /><span className="hidden sm:inline">Besucheransicht</span></a><button aria-label="Benachrichtigungen" className="rounded-xl border border-black/10 bg-white p-2.5"><Bell size={18} /></button></div>
      </header>
      <div className="mx-auto min-w-0 w-[90%] py-5">
        {section === "overview" && <Overview key={currentTenant.id} tenant={currentTenant} stationCount={stations.filter((station) => !station.isTemplate).length} templateCount={stations.filter((station) => station.isTemplate).length} onNavigate={setSection} />}
        {section === "stations" && <Stations key={currentTenant.id} tenant={currentTenant} stations={stations} onEdit={setEditing} onRemove={removeStation} onCreate={() => setEditing(blankStation(currentTenant.id))} onImport={importStations} />}
        {section === "categories" && <Categories key={currentTenant.id} tenant={currentTenant} saving={saving} onSave={saveTenant} />}
        {section === "tenants" && <TenantSettings key={currentTenant.id} tenant={currentTenant} saving={saving} onSave={saveTenant} />}
        {section === "branding" && <Branding key={currentTenant.id} tenant={currentTenant} saving={saving} onSave={saveTenant} />}
        {section === "legal" && <Legal key={currentTenant.id} tenant={currentTenant} saving={saving} onSave={saveTenant} />}
        {section === "modules" && <Modules key={currentTenant.id} tenant={currentTenant} saving={saving} onSave={saveTenant} />}
        {section === "integrations" && <Integrations key={currentTenant.id} tenant={currentTenant} saving={saving} onSave={saveTenant} />}
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

function Overview({ tenant, stationCount, templateCount, onNavigate }: { tenant: Tenant; stationCount: number; templateCount: number; onNavigate: (id: string) => void }) {
  return <div className="animate-enter"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm text-[#1b302a]/55">Guten Tag, Michael.</p><h2 className="mt-1 font-display text-4xl">Alles im grünen Bereich.</h2></div><p className="flex items-center gap-2 text-sm font-bold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" /> System betriebsbereit</p></div><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Campingplätze" value="1" note="Aktiver Mandant" icon={<Caravan />} /><Metric label="Stationen" value={String(stationCount)} note={`${templateCount} Vorlagen`} icon={<MapPinned />} /><Metric label="Besuche heute" value="—" note="Tracking deaktiviert" icon={<Activity />} /><Metric label="Admins" value="1" note="Plattformweit" icon={<Users />} /></div><div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]"><section className="rounded-2xl bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-display text-2xl">Dein Campingplatz</h3><button onClick={() => onNavigate("tenants")} className="text-sm font-bold text-[#286551]">Verwalten <ChevronRight size={16} className="inline" /></button></div><div className="mt-5 flex items-center gap-4 rounded-2xl bg-[#eff3ec] p-4"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-white p-1.5 shadow-sm"><Image src={platformLogo} alt="Platzguide" width={44} height={44} className="h-full w-full object-contain" /></span><div><p className="font-bold">{tenant.name}</p><p className="text-sm text-[#1b302a]/50">{tenant.slug}.app-domain.de</p></div><span className="ml-auto rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Aktiv</span></div></section><section className="rounded-2xl bg-[#173c32] p-6 text-white"><CircleAlert className="text-[#e8b65f]" /><h3 className="mt-5 font-display text-2xl">Vor dem Livegang</h3><p className="mt-2 text-sm leading-6 text-white/55">Datenbank, Passwort-Hash, Domain und rechtlich geprüfte Texte hinterlegen.</p><button onClick={() => onNavigate("security")} className="mt-5 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#173c32]">Checkliste öffnen</button></section></div></div>;
}

function Metric({ label, value, note, icon }: { label: string; value: string; note: string; icon: React.ReactNode }) { return <div className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex justify-between text-[#286551]"><p className="text-xs font-bold uppercase tracking-widest text-[#1b302a]/40">{label}</p>{icon}</div><p className="mt-4 font-display text-4xl">{value}</p><p className="mt-1 text-xs text-[#1b302a]/45">{note}</p></div>; }

function Stations({ tenant, stations, onEdit, onRemove, onCreate, onImport }: { tenant: Tenant; stations: Station[]; onEdit: (station: Station) => void; onRemove: (id: string) => void; onCreate: () => void; onImport: (stations: Station[]) => Promise<void> }) {
  return <section className="animate-enter overflow-hidden rounded-xl bg-white shadow-sm">
    <div className="flex flex-col gap-3 border-b border-black/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="font-display text-2xl">Stationen</h2><p className="text-sm text-black/45">Orte, Services und Erlebnisse</p></div>
      <div className="flex flex-wrap gap-2"><StationImport tenantId={tenant.id} categories={tenant.categories} onImport={onImport} /><button onClick={onCreate} className="rounded-xl bg-[#173c32] px-4 py-3 text-sm font-bold text-white"><Plus size={17} className="mr-2 inline" /> Neue Station</button></div>
    </div>
    <div className="p-3"><label className="flex w-full items-center gap-2 rounded-lg bg-[#f2f3ef] px-3 py-2.5"><Search size={17} /><input placeholder="Station suchen …" className="min-w-0 w-full bg-transparent outline-none" /></label></div>
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

function TenantSettings({ tenant, saving, onSave }: { tenant: Tenant; saving: boolean; onSave: (tenant: Tenant) => void }) {
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
    <SettingsCard title="Campingplatz & Domain" description="Die Zuordnung erfolgt zentral über Domain oder Subdomain.">
      <Field label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
      <Field label="Subdomain" value={draft.slug} suffix=".app-domain.de" onChange={(slug) => setDraft({ ...draft, slug })} />
      <Field label="Domains" value={hostText} onChange={(hosts) => setDraft({ ...draft, hosts: hosts.split(",").map((host) => host.trim()).filter(Boolean) })} />
      <div className="rounded-xl bg-[#f7f7f4] p-4 text-sm leading-6 text-black/65">
        <p className="font-bold text-[#1b302a]">DNS-Anleitung</p>
        <p>Für eine Subdomain: <code>{draft.slug}.deine-domain.de</code> als CNAME auf die Hauptdomain setzen oder als A-Record auf die Server-IP zeigen lassen.</p>
        <p>Für viele Mandanten: Wildcard <code>*.deine-domain.de</code> auf die Plattform zeigen lassen. Danach die Domain hier bei „Domains“ eintragen.</p>
        <p>Reverse Proxy: Ziel ist der öffentliche Nginx der App, üblicherweise <code>http://SERVER-IP:80</code>.</p>
      </div>
      <Field label="Kontakt-Telefon" value={draft.contact.phone} onChange={(phone) => setDraft({ ...draft, contact: { ...draft.contact, phone } })} />
      <Field label="Kontakt-E-Mail" value={draft.contact.email} onChange={(email) => setDraft({ ...draft, contact: { ...draft.contact, email } })} />
      <Field label="Notfallkontakt" value={draft.contact.emergency} onChange={(emergency) => setDraft({ ...draft, contact: { ...draft.contact, emergency } })} />
      <Save saving={saving} onClick={save} />
    </SettingsCard>
    <SettingsCard title="Kartengrundlagen" description="Freie Basiskarte, optionales regionales Luftbild und eigener Platzplan.">
      <div className="rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"><strong>Empfohlen:</strong> OpenFreeMap für Wege und Orientierung. Ergänzend kann ein lizenzierter Luftbild-WMS oder ein eigener Lageplan eingeblendet werden.</div>
      <Field label="Kartenstil-URL" value={draft.map.styleUrl} onChange={(styleUrl) => setDraft({ ...draft, map: { ...draft.map, configured: true, styleUrl } })} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Mittelpunkt Längengrad" value={String(draft.map.center[0])} onChange={(longitude) => setDraft({ ...draft, map: { ...draft.map, configured: true, center: [Number(longitude), draft.map.center[1]] } })} />
        <Field label="Mittelpunkt Breitengrad" value={String(draft.map.center[1])} onChange={(latitude) => setDraft({ ...draft, map: { ...draft.map, configured: true, center: [draft.map.center[0], Number(latitude)] } })} />
        <Field label="Start-Zoom" value={String(draft.map.zoom)} onChange={(zoom) => setDraft({ ...draft, map: { ...draft.map, configured: true, zoom: Number(zoom) } })} />
      </div>
      <Field label="Luftbild-Tile/WMS-URL (optional)" value={draft.map.aerialTiles?.[0] ?? ""} onChange={(tile) => setDraft({ ...draft, map: { ...draft.map, configured: true, aerialTiles: tile ? [tile] : undefined } })} />
      <Field label="Luftbild-Quellenangabe" value={draft.map.aerialAttribution ?? ""} onChange={(aerialAttribution) => setDraft({ ...draft, map: { ...draft.map, aerialAttribution } })} />
      <Field label="Platzplan-Bild-URL" value={draft.map.sitePlan?.imageUrl ?? ""} onChange={(imageUrl) => setDraft({ ...draft, map: { ...draft.map, configured: Boolean(imageUrl) || draft.map.configured, sitePlan: imageUrl ? draft.map.sitePlan ?? { imageUrl, coordinates: [[draft.map.center[0] - 0.001, draft.map.center[1] + 0.001], [draft.map.center[0] + 0.001, draft.map.center[1] + 0.001], [draft.map.center[0] + 0.001, draft.map.center[1] - 0.001], [draft.map.center[0] - 0.001, draft.map.center[1] - 0.001]], attribution: "Eigener Lageplan" } : undefined } })} />
      <label className="block text-sm font-bold">Platzplan hochladen<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(event) => event.target.files?.[0] && uploadSitePlan(event.target.files[0])} className="mt-2 block w-full rounded-xl border border-dashed border-black/20 bg-[#fafaf8] p-4 text-sm font-normal" /></label>
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
  </div>;
}
function Branding({ tenant, saving, onSave }: { tenant: Tenant; saving: boolean; onSave: (tenant: Tenant) => void }) { const [draft, setDraft] = useState(tenant); return <SettingsCard title="Erscheinungsbild" description="Farben und Texte werden nur für diesen Mandanten ausgespielt."><Field label="Claim" value={draft.tagline} onChange={(tagline) => setDraft({ ...draft, tagline })} /><Field label="Logo-Kürzel" value={draft.logoMark} onChange={(logoMark) => setDraft({ ...draft, logoMark })} /><div className="grid gap-4 sm:grid-cols-3"><Color label="Primärfarbe" value={draft.theme.primary} onChange={(primary) => setDraft({ ...draft, theme: { ...draft.theme, primary } })} /><Color label="Akzentfarbe" value={draft.theme.secondary} onChange={(secondary) => setDraft({ ...draft, theme: { ...draft.theme, secondary } })} /><Color label="Hintergrund" value={draft.theme.surface} onChange={(surface) => setDraft({ ...draft, theme: { ...draft.theme, surface } })} /></div><Save saving={saving} onClick={() => onSave(draft)} /></SettingsCard>; }
function Legal({ tenant, saving, onSave }: { tenant: Tenant; saving: boolean; onSave: (tenant: Tenant) => void }) { const [draft, setDraft] = useState(tenant); return <SettingsCard title="Rechtstexte" description="Jeder Campingplatz benötigt eigene, rechtlich geprüfte Angaben."><Area label="Impressum" value={draft.legal.imprint} onChange={(imprint) => setDraft({ ...draft, legal: { ...draft.legal, imprint } })} /><Area label="Datenschutz" value={draft.legal.privacy} onChange={(privacy) => setDraft({ ...draft, legal: { ...draft.legal, privacy } })} /><Area label="Cookie-Hinweise" value={draft.legal.cookies} onChange={(cookies) => setDraft({ ...draft, legal: { ...draft.legal, cookies } })} /><Save saving={saving} onClick={() => onSave(draft)} /></SettingsCard>; }
function Modules({ tenant, saving, onSave }: { tenant: Tenant; saving: boolean; onSave: (tenant: Tenant) => void }) { const [draft, setDraft] = useState(tenant); const modules = [["Rundgänge", "tours", "Für Besucher-App und Verwaltung freischalten"], ["Check-ins & QR-Code", "checkins", "Für Besucher-App und Verwaltung freischalten"], ["Veranstaltungen", "events", "Für Besucher-App und Verwaltung freischalten"], ["Feedback", "feedback", "Für Besucher-App und Verwaltung freischalten"], ["Platzguide-Pass", "rewards", "Für Besucher-App und Verwaltung freischalten"], ["Push-Mitteilungen", "push", "Vorbereitet, aber erst mit VAPID/Push-Service wirklich aktiv"], ["Belegungs-/Statusanzeigen", "occupancy", "Für Besucher-App und Verwaltung freischalten"], ["Digitale Gästemappe", "guestGuide", "Mandantengebundene Inhalte für Gäste"]]; return <SettingsCard title="Funktionsmodule" description="Funktionen lassen sich je Campingplatz aktivieren.">{modules.map(([label, id, note]) => <label key={id} className="flex min-w-0 items-center justify-between gap-4 border-b border-black/5 py-4"><div className="min-w-0"><p className="break-words font-bold">{label}</p><p className="text-xs text-black/45">{note}</p></div><input type="checkbox" checked={draft.features[id] ?? false} onChange={(event) => setDraft({ ...draft, features: { ...draft.features, [id]: event.target.checked } })} className="h-5 w-5 shrink-0 accent-[#286551]" /></label>)}<Save saving={saving} onClick={() => onSave(draft)} /></SettingsCard>; }
function Integrations({ tenant, saving, onSave }: { tenant: Tenant; saving: boolean; onSave: (tenant: Tenant) => void }) {
  const [draft, setDraft] = useState(tenant);
  return <div className="space-y-6">
    <SettingsCard title="Maildienst" description="Platzguide nutzt ausschließlich klassisches SMTP. Das Passwort bleibt als Server-Variable gespeichert.">
      <Select label="Provider" value={draft.integrations.mail.provider} options={["smtp"]} onChange={() => setDraft({ ...draft, integrations: { ...draft.integrations, mail: { ...draft.integrations.mail, provider: "smtp" } } })} />
      <Field label="Absender-E-Mail" value={draft.integrations.mail.fromEmail} onChange={(fromEmail) => setDraft({ ...draft, integrations: { ...draft.integrations, mail: { ...draft.integrations.mail, fromEmail } } })} />
      <Field label="Absender-Name" value={draft.integrations.mail.fromName} onChange={(fromName) => setDraft({ ...draft, integrations: { ...draft.integrations, mail: { ...draft.integrations.mail, fromName } } })} />
      <Field label="SMTP-Host" value={draft.integrations.mail.smtpHost} onChange={(smtpHost) => setDraft({ ...draft, integrations: { ...draft.integrations, mail: { ...draft.integrations.mail, smtpHost } } })} />
      <Field label="SMTP-Port" value={String(draft.integrations.mail.smtpPort)} onChange={(smtpPort) => setDraft({ ...draft, integrations: { ...draft.integrations, mail: { ...draft.integrations.mail, smtpPort: Number(smtpPort) || 587 } } })} />
      <Field label="SMTP-Benutzer" value={draft.integrations.mail.smtpUser} onChange={(smtpUser) => setDraft({ ...draft, integrations: { ...draft.integrations, mail: { ...draft.integrations.mail, smtpUser } } })} />
      <label className="flex items-center justify-between gap-4 rounded-xl border border-black/10 p-3 text-sm font-bold">TLS/SSL direkt verwenden<input type="checkbox" checked={draft.integrations.mail.smtpSecure} onChange={(event) => setDraft({ ...draft, integrations: { ...draft.integrations, mail: { ...draft.integrations.mail, smtpSecure: event.target.checked } } })} className="h-5 w-5 accent-[#286551]" /></label>
      <p className="rounded-xl bg-[#f7f7f4] p-3 text-xs leading-5 text-black/55">Server-Variablen: <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_SECURE</code>, <code>SMTP_USER</code>, <code>SMTP_PASSWORD</code>, <code>MAIL_FROM</code>, <code>MAIL_FROM_NAME</code>.</p>
    </SettingsCard>
    <SettingsCard title="Captcha & Self-Service" description="Turnstile oder hCaptcha schützt öffentliche Registrierung.">
      <Select label="Captcha-Provider" value={draft.integrations.captcha.provider} options={["disabled", "turnstile", "hcaptcha"]} onChange={(provider) => setDraft({ ...draft, integrations: { ...draft.integrations, captcha: { ...draft.integrations.captcha, provider: provider as Tenant["integrations"]["captcha"]["provider"] } } })} />
      <Field label="Öffentlicher Site-Key" value={draft.integrations.captcha.siteKey} onChange={(siteKey) => setDraft({ ...draft, integrations: { ...draft.integrations, captcha: { ...draft.integrations.captcha, siteKey } } })} />
      <label className="flex items-center justify-between gap-4 rounded-xl border border-black/10 p-3 text-sm font-bold">Für Registrierung erforderlich<input type="checkbox" checked={draft.integrations.captcha.requiredForSignup} onChange={(event) => setDraft({ ...draft, integrations: { ...draft.integrations, captcha: { ...draft.integrations.captcha, requiredForSignup: event.target.checked } } })} className="h-5 w-5 accent-[#286551]" /></label>
      <p className="rounded-xl bg-[#f7f7f4] p-3 text-xs leading-5 text-black/55">Server-Variablen: `CAPTCHA_PROVIDER`, `NEXT_PUBLIC_CAPTCHA_SITE_KEY`, `TURNSTILE_SECRET_KEY` oder `HCAPTCHA_SECRET_KEY`.</p>
    </SettingsCard>
    <SettingsCard title="Storage, Datenbank & Backup" description="Betriebsparameter für Uploads, PostgreSQL und Sicherungen.">
      <Select label="Storage" value={draft.integrations.storage.provider} options={["local", "s3", "external-url"]} onChange={(provider) => setDraft({ ...draft, integrations: { ...draft.integrations, storage: { ...draft.integrations.storage, provider: provider as Tenant["integrations"]["storage"]["provider"] } } })} />
      <Field label="Max. Upload MB" value={String(draft.integrations.storage.maxUploadMb)} onChange={(maxUploadMb) => setDraft({ ...draft, integrations: { ...draft.integrations, storage: { ...draft.integrations.storage, maxUploadMb: Number(maxUploadMb) } } })} />
      <Area label="Erlaubte MIME-Typen" value={draft.integrations.storage.allowedTypes.join("\n")} onChange={(value) => setDraft({ ...draft, integrations: { ...draft.integrations, storage: { ...draft.integrations.storage, allowedTypes: value.split("\n").map((item) => item.trim()).filter(Boolean) } } })} />
      <Select label="Datenbank" value={draft.integrations.database.provider} options={["postgresql"]} onChange={() => setDraft({ ...draft, integrations: { ...draft.integrations, database: { ...draft.integrations.database, provider: "postgresql" } } })} />
      <label className="flex items-center justify-between gap-4 rounded-xl border border-black/10 p-3 text-sm font-bold">RLS erzwingen<input type="checkbox" checked={draft.integrations.database.rlsRequired} onChange={(event) => setDraft({ ...draft, integrations: { ...draft.integrations, database: { ...draft.integrations.database, rlsRequired: event.target.checked } } })} className="h-5 w-5 accent-[#286551]" /></label>
      <label className="flex items-center justify-between gap-4 rounded-xl border border-black/10 p-3 text-sm font-bold">Backups aktiv<input type="checkbox" checked={draft.integrations.backup.enabled} onChange={(event) => setDraft({ ...draft, integrations: { ...draft.integrations, backup: { ...draft.integrations.backup, enabled: event.target.checked } } })} className="h-5 w-5 accent-[#286551]" /></label>
      <Field label="Backup-Zeitplan" value={draft.integrations.backup.schedule} onChange={(schedule) => setDraft({ ...draft, integrations: { ...draft.integrations, backup: { ...draft.integrations.backup, schedule } } })} />
      <Field label="Aufbewahrung Tage" value={String(draft.integrations.backup.retentionDays)} onChange={(retentionDays) => setDraft({ ...draft, integrations: { ...draft.integrations, backup: { ...draft.integrations.backup, retentionDays: Number(retentionDays) } } })} />
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
  return <SettingsCard title="Medienbibliothek" description="Bilder, PDFs und spätere Uploads zentral verwalten.">
    <div className="flex flex-wrap gap-2"><button onClick={add} className="rounded-xl border px-4 py-3 text-sm font-bold"><Plus size={16} className="mr-2 inline" />Medium hinzufügen</button><label className="rounded-xl border px-4 py-3 text-sm font-bold">Datei hochladen<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="sr-only" onChange={(event) => event.target.files?.[0] && uploadMedia(event.target.files[0])} /></label><Save saving={saving} onClick={() => onSave(draft)} /></div>
    <div className="grid gap-3 lg:grid-cols-2">{draft.media.map((asset) => <div key={asset.id} className="rounded-xl border border-black/10 p-3"><Field label="Titel" value={asset.title} onChange={(title) => update(asset.id, { title })} /><Field label="URL" value={asset.url} onChange={(url) => update(asset.id, { url })} /><Field label="Alternativtext" value={asset.alt} onChange={(alt) => update(asset.id, { alt })} /><button onClick={() => setDraft({ ...draft, media: draft.media.filter((item) => item.id !== asset.id) })} className="mt-3 text-sm font-bold text-red-600">Entfernen</button></div>)}</div>
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
    {draft.feedback.map((message) => <div key={message.id} className="rounded-xl border border-black/10 p-4"><p className="text-xs text-black/45">{formatStableDate(message.createdAt)}</p><p className="mt-2">{message.message}</p><select value={message.status} onChange={(event) => setDraft({ ...draft, feedback: draft.feedback.map((item) => item.id === message.id ? { ...item, status: event.target.value as typeof message.status } : item) })} className="mt-3 rounded-xl border p-3"><option value="new">Neu</option><option value="reviewed">Geprüft</option><option value="resolved">Erledigt</option></select></div>)}
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
function Security() { return <div className="grid min-w-0 gap-6 xl:grid-cols-2"><SettingsCard title="Sicherheitsstatus" description="Zentrale Schutzmaßnahmen für die Plattform.">{["Rollenmodell für Plattform und Mandanten", "HTTP-only Session-Cookie", "Tenant-Kontext pro Anfrage", "Datenbank-RLS vorbereitet", "Self-Service standardmäßig geschlossen", "Datenschutz-Export und Löschanfrage"].map((item) => <p key={item} className="flex min-w-0 items-center gap-3 border-b border-black/5 py-3 text-sm"><ShieldCheck size={18} className="shrink-0 text-emerald-600" /><span className="min-w-0 break-words">{item}</span></p>)}</SettingsCard><SettingsCard title="Produktions-Checkliste" description="Diese Punkte müssen beim Deployment gesetzt werden.">{["Sicheres ADMIN_PASSWORD_HASH", "Zufälliges AUTH_SECRET", "PostgreSQL-Verbindung", "DNS/Wildcard-Domain", "E-Mail-Verifikation und Rate-Limits", "Rechtstexte juristisch prüfen"].map((item) => <label key={item} className="flex min-w-0 items-center gap-3 border-b border-black/5 py-3 text-sm"><input type="checkbox" className="h-4 w-4 shrink-0" /><span className="min-w-0 break-words">{item}</span></label>)}</SettingsCard></div>; }
function SettingsCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <section className="min-w-0 w-full overflow-hidden animate-enter rounded-xl bg-white p-5 shadow-sm"><h2 className="break-words font-display text-2xl">{title}</h2><p className="mt-1 break-words text-sm text-black/45">{description}</p><div className="mt-4 min-w-0 space-y-4">{children}</div></section>; }
function ModuleListHeader({ onAdd, saving, onSave }: { onAdd: () => void; saving: boolean; onSave: () => void }) { return <div className="flex flex-wrap gap-2"><button onClick={onAdd} className="rounded-xl border px-4 py-3 text-sm font-bold"><Plus size={16} className="mr-2 inline" />Hinzufügen</button><Save saving={saving} onClick={onSave} /></div>; }
function AdminItem({ active, onToggle, onRemove, children }: { active: boolean; onToggle: (active: boolean) => void; onRemove: () => void; children: React.ReactNode }) { return <div className="space-y-3 rounded-xl border border-black/10 p-4"><div className="flex items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={active} onChange={(event) => onToggle(event.target.checked)} className="h-4 w-4 accent-[#286551]" /> Aktiv</label><button onClick={onRemove} className="text-sm font-bold text-red-600">Entfernen</button></div>{children}</div>; }
function Field({ label, value, suffix, onChange }: { label: string; value: string; suffix?: string; onChange: (value: string) => void }) { return <label className="block min-w-0 text-sm font-bold">{label}<div className="mt-2 flex rounded-xl border border-black/10 bg-[#fafaf8]"><input value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent px-4 py-3 outline-none" />{suffix && <span className="shrink-0 border-l border-black/10 px-3 py-3 text-black/40">{suffix}</span>}</div></label>; }
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label className="block min-w-0 text-sm font-bold">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-black/10 bg-[#fafaf8] px-4 py-3 outline-none">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }
function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block min-w-0 text-sm font-bold">{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-black/10 bg-[#fafaf8] px-4 py-3 font-normal leading-6 outline-none" /></label>; }
function Color({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="min-w-0 text-sm font-bold">{label}<div className="mt-2 flex items-center gap-2 rounded-xl border border-black/10 p-2"><input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-10 shrink-0 border-0 bg-transparent" /><input value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" /></div></label>; }
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
        <label className="block text-sm font-bold">Name<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-2 w-full rounded-xl border p-3" /></label>
        <label className="block text-sm font-bold">Kategorie<select value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })} className="mt-2 w-full rounded-xl border p-3">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="block text-sm font-bold">Kurzbeschreibung<input value={draft.shortDescription} onChange={(event) => setDraft({ ...draft, shortDescription: event.target.value })} className="mt-2 w-full rounded-xl border p-3" /></label>
        <label className="block text-sm font-bold">Beschreibung<textarea rows={5} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="mt-2 w-full rounded-xl border p-3" /></label>
        <label className="block text-sm font-bold">Öffnungszeiten<input value={draft.openingHours} onChange={(event) => setDraft({ ...draft, openingHours: event.target.value })} className="mt-2 w-full rounded-xl border p-3" /></label>
        <label className="block text-sm font-bold">Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Station["status"] })} className="mt-2 w-full rounded-xl border p-3"><option value="open">Geöffnet</option><option value="closed">Geschlossen</option><option value="limited">Eingeschränkt</option><option value="maintenance">Nicht verfügbar</option></select></label>
        <label className="flex items-start gap-3 rounded-xl bg-[#f7f7f4] p-4 text-sm font-bold"><input type="checkbox" checked={!draft.isTemplate} onChange={(event) => setDraft({ ...draft, isTemplate: !event.target.checked })} className="mt-0.5 h-5 w-5 accent-[#286551]" /><span><span>In Besucher-App anzeigen</span><span className="mt-1 block font-normal leading-5 text-black/50">Standardstationen starten als Vorlage und werden erst nach Aktivierung öffentlich sichtbar.</span></span></label>
        <StationLocationPicker mapConfig={mapConfig} longitude={draft.longitude} latitude={draft.latitude} onChange={(position) => setDraft((current) => ({ ...current, ...position }))} />
      </div>
      <div className="mt-8 flex gap-3"><button type="button" onClick={onClose} className="flex-1 rounded-xl border px-4 py-3 font-bold">Abbrechen</button><button className="flex-1 rounded-xl bg-[#173c32] px-4 py-3 font-bold text-white">Speichern</button></div>
    </form>
  </div>;
}
