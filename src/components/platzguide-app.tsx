"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import { Activity, Bell, BookOpen, CalendarDays, ChevronRight, Compass, Gift, Heart, Info, List, Map, MessageSquareWarning, Navigation, Route, Search, ShieldAlert, X } from "lucide-react";
import type { Station, Tenant } from "@/lib/types";
import { cn, statusLabel } from "@/lib/utils";
import { CampMap } from "@/components/camp-map";

const platformLogo = "/icons/platzguide-logo.png";

export function PlatzguideApp({ tenant, basePath = "" }: { tenant: Tenant; basePath?: string }) {
  const [view, setView] = useState<"map" | "list">("map");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<Station | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [feedbackContact, setFeedbackContact] = useState("");
  const [feedbackFile, setFeedbackFile] = useState<File | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [pushState, setPushState] = useState("");
  const [checkins, setCheckins] = useState<string[]>([]);

  const stations = useMemo(() => tenant.stations.filter((station) => {
    if (station.isTemplate) return false;
    const matchesCategory = category === "all" || station.categoryId === category;
    const haystack = `${station.name} ${station.shortDescription}`.toLowerCase();
    return matchesCategory && haystack.includes(query.toLowerCase());
  }), [tenant.stations, category, query]);
  const mapConfigured = tenant.map.configured !== false && tenant.stations.length > 0;

  function toggleFavorite(id: string) {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function sendFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!feedback.trim()) return;
    const formData = new FormData();
    formData.set("message", feedback);
    formData.set("contact", feedbackContact);
    formData.set("tenantSlug", tenant.slug);
    if (feedbackFile) formData.set("file", feedbackFile);
    const response = await fetch("/api/feedback", { method: "POST", body: formData });
    if (response.ok) {
      setFeedback("");
      setFeedbackContact("");
      setFeedbackFile(null);
      setFeedbackSent(true);
    }
  }

  async function enablePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushState("Push wird von diesem Gerät nicht unterstützt.");
      return;
    }
    const config = await fetch("/api/push/subscribe").then((response) => response.json()) as { publicKey?: string; configured?: boolean };
    if (!config.publicKey) {
      setPushState("Push ist noch nicht vollständig konfiguriert.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setPushState("Push wurde nicht erlaubt.");
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey)
    });
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantSlug: tenant.slug, subscription: subscription.toJSON() })
    });
    setPushState(response.ok ? "Push ist für diesen Platzguide aktiv." : "Push-Abo konnte nicht gespeichert werden.");
  }

  async function checkIn(stationId: string) {
    const deviceId = getDeviceId();
    const response = await fetch("/api/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantSlug: tenant.slug, stationId, deviceId })
    });
    if (!response.ok) return;
    setCheckins((current) => current.includes(stationId) ? current : [...current, stationId]);
  }

  return (
    <main>
      <header className="relative overflow-hidden bg-[var(--primary)] py-3 text-white sm:py-4">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full border-[36px] border-white/5 sm:h-64 sm:w-64 sm:border-[42px]" />
        <div className="relative mx-auto w-[90%]">
          <div className="flex items-center justify-between">
            <a href="https://platzguide.de" className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/95 p-1.5 shadow-sm sm:h-12 sm:w-12 sm:rounded-2xl">
                <Image src={platformLogo} alt="Platzguide" width={40} height={40} className="h-full w-full object-contain" priority />
              </span>
              <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/60 sm:text-[11px]">Platzguide</p><p className="truncate font-display text-lg sm:text-xl">{tenant.name}</p></div>
            </a>
            <a href={`${basePath}/hinweise`} aria-label="Wichtige Hinweise" className="rounded-full bg-white/10 p-2.5 sm:p-3"><Info size={18} /></a>
          </div>
          <div className="mt-3 sm:mt-5">
            <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-[var(--secondary)] sm:text-xs"><Compass size={14} /> Vor Ort</p>
            <h1 className="font-display text-2xl leading-[1.05] sm:text-4xl">Orte auf dem Platz</h1>
          </div>
          {searchOpen && <label className="mt-3 flex w-full items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm text-[#18332b] shadow-xl sm:mt-5 sm:text-base">
            <Search size={18} className="text-[#18332b]/50" />
            <span className="sr-only">Stationen suchen</span>
            <input title="Suche nach Stationen, Kategorien oder Begriffen wie Dusche, Restaurant oder Spielplatz." aria-label="Stationen suchen" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Spielplatz, Dusche, Restaurant …" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#18332b]/40" />
          </label>}
        </div>
      </header>

      <section className="mx-auto w-[90%] py-3 sm:py-4">
        <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-2 sm:gap-2">
          <Filter active={category === "all"} onClick={() => setCategory("all")}>Alle Orte</Filter>
          {tenant.categories.map((item) => <Filter key={item.id} active={category === item.id} onClick={() => setCategory(item.id)}>{item.name}</Filter>)}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 sm:mt-3">
          <p className="text-sm font-bold leading-tight sm:text-base">{stations.length}<span className="block sm:inline"> Orte gefunden</span></p>
          <div className="flex shrink-0 rounded-xl bg-white p-1 shadow-sm">
            <button aria-label="Suche öffnen" onClick={() => setSearchOpen((value) => !value)} className={cn("rounded-lg px-2.5 py-2 text-xs font-bold sm:px-3 sm:text-sm", searchOpen && "bg-[var(--primary)] text-white")}><Search size={16} className="inline -mt-0.5 sm:mr-1" /><span className="hidden sm:inline">Suche</span></button>
            <button aria-label="Karte anzeigen" onClick={() => mapConfigured && setView("map")} disabled={!mapConfigured} className={cn("rounded-lg px-2.5 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 sm:text-sm", view === "map" && "bg-[var(--primary)] text-white")}><Map size={16} className="inline -mt-0.5 sm:mr-1" /><span className="hidden sm:inline">Karte</span></button>
            <button aria-label="Liste anzeigen" onClick={() => setView("list")} className={cn("rounded-lg px-2.5 py-2 text-xs font-bold sm:px-3 sm:text-sm", view === "list" && "bg-[var(--primary)] text-white")}><List size={16} className="inline -mt-0.5 sm:mr-1" /><span className="hidden sm:inline">Liste</span></button>
          </div>
        </div>

        {!mapConfigured && <div className="mt-4 rounded-[1.5rem] border-4 border-white bg-[#dce8d0] p-6 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--primary)]">Noch keine Karte</p>
          <h2 className="mt-2 font-display text-3xl">Der Platz wird gerade eingerichtet.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#18332b]/65">Sobald der Betreiber Adresse, Kartenmittelpunkt und erste Stationen gepflegt hat, erscheint hier die interaktive Platzkarte.</p>
        </div>}

        {mapConfigured && view === "map" ? (
          <CampMap tenant={tenant} stations={stations} selected={selected} onSelect={setSelected} />
        ) : mapConfigured || stations.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {stations.map((station) => <StationCard key={station.id} station={station} favorite={favorites.includes(station.id)} onFavorite={() => toggleFavorite(station.id)} onSelect={() => setSelected(station)} />)}
          </div>
        ) : null}
      </section>

      <section className="mx-auto w-[90%] py-5">
        <div className="rounded-2xl bg-[#e8ddd0] p-5 sm:flex sm:items-center sm:justify-between">
          <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#8a4b31]"><ShieldAlert size={17} /> Gut zu wissen</p><h2 className="mt-2 font-display text-3xl">Wichtige Hinweise & Notfall</h2><p className="mt-2 text-sm text-[#18332b]/65">Platzruhe, Regeln, ärztliche Hilfe und direkte Kontakte.</p></div>
          <a href={`${basePath}/hinweise`} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#18332b] px-5 py-3 text-sm font-bold text-white sm:mt-0">Hinweise öffnen <ChevronRight size={18} /></a>
        </div>
      </section>

      <section className="mx-auto grid w-[90%] gap-4 py-2 md:grid-cols-2">
        {tenant.features.push && (tenant.pushMessages ?? []).filter((message) => message.active).length > 0 && <ModuleCard icon={<Bell />} title="Aktuelle Mitteilungen">
          <button onClick={enablePush} className="rounded-xl border border-black/10 px-4 py-3 text-sm font-bold">Push aktivieren</button>
          {pushState && <p className="text-sm text-[#18332b]/60">{pushState}</p>}
          {(tenant.pushMessages ?? []).filter((message) => message.active).map((message) => <CompactItem key={message.id} title={message.title} text={message.body} />)}
        </ModuleCard>}
        {tenant.features.occupancy && (tenant.occupancyStatuses ?? []).filter((item) => item.active).length > 0 && <ModuleCard icon={<Activity />} title="Status vor Ort">
          {(tenant.occupancyStatuses ?? []).filter((item) => item.active).map((item) => <CompactItem key={item.id} title={`${item.label} · ${occupancyLabel[item.status]}`} text={item.note || `Aktualisiert: ${formatStableDate(item.updatedAt)}`} />)}
        </ModuleCard>}
        {tenant.features.events && tenant.events.filter((event) => event.active).length > 0 && <ModuleCard icon={<CalendarDays />} title="Veranstaltungen">
          {tenant.events.filter((event) => event.active).map((event) => <CompactItem key={event.id} title={event.title} text={`${formatStableDate(event.startsAt)} · ${event.location}`} />)}
        </ModuleCard>}
        {tenant.features.tours && tenant.tours.filter((tour) => tour.active).length > 0 && <ModuleCard icon={<Route />} title="Rundgänge">
          {tenant.tours.filter((tour) => tour.active).map((tour) => <CompactItem key={tour.id} title={tour.title} text={`${tour.durationMinutes} Minuten · ${tour.stops.length} Stationen`} />)}
        </ModuleCard>}
        {tenant.features.rewards && tenant.rewards.filter((reward) => reward.active).length > 0 && <ModuleCard icon={<Gift />} title="Platzguide-Pass">
          <p className="rounded-xl bg-[#f7f4ed] p-3 text-sm font-bold">{checkins.length} Check-ins auf diesem Gerät</p>
          {tenant.rewards.filter((reward) => reward.active).map((reward) => <CompactItem key={reward.id} title={reward.title} text={`${reward.requiredCheckins} Check-ins · ${reward.description}`} />)}
        </ModuleCard>}
        {tenant.features.guestGuide && tenant.guestGuide.length > 0 && <ModuleCard icon={<BookOpen />} title="Gästemappe">
          {tenant.guestGuide.sort((a, b) => a.sortOrder - b.sortOrder).map((item) => <CompactItem key={item.id} title={item.title} text={item.body} />)}
        </ModuleCard>}
        {tenant.features.feedback && <ModuleCard icon={<MessageSquareWarning />} title="Feedback">
          {feedbackSent && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">Danke, die Meldung ist angekommen.</p>}
          <form onSubmit={sendFeedback} className="space-y-3">
            <textarea title="Beschreibe kurz, was am Platzguide geprüft oder korrigiert werden soll." aria-label="Feedback oder Fehlermeldung" value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={3} placeholder="Was sollen wir prüfen?" className="w-full rounded-xl border border-black/10 bg-[#fafaf8] p-3 text-sm outline-none" />
            <input title="Optional: E-Mail oder Telefonnummer für Rückfragen." aria-label="Kontakt für Rückfragen" value={feedbackContact} onChange={(event) => setFeedbackContact(event.target.value)} placeholder="Kontakt optional" className="w-full rounded-xl border border-black/10 bg-[#fafaf8] p-3 text-sm outline-none" />
            <label className="block rounded-xl border border-dashed border-black/10 bg-[#fafaf8] p-3 text-sm font-bold">Foto oder PDF optional<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(event) => setFeedbackFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full text-sm font-normal" /></label>
            <button className="rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-bold text-white">Meldung senden</button>
          </form>
        </ModuleCard>}
      </section>

      {selected && <StationSheet station={selected} checkinsEnabled={tenant.features.checkins || tenant.features.rewards} checkedIn={checkins.includes(selected.id)} favorite={favorites.includes(selected.id)} onFavorite={() => toggleFavorite(selected.id)} onCheckin={() => checkIn(selected.id)} onClose={() => setSelected(null)} />}
    </main>
  );
}

function formatStableDate(value: string) {
  return value.slice(0, 16).replace("T", " ");
}

function Filter({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={cn("shrink-0 rounded-full border px-3 py-2 text-xs font-bold transition sm:px-4 sm:py-2.5 sm:text-sm", active ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[#18332b]/10 bg-white hover:border-[var(--primary)]")}>{children}</button>;
}

function StationCard({ station, favorite, onFavorite, onSelect }: { station: Station; favorite: boolean; onFavorite: () => void; onSelect: () => void }) {
  return <article className="overflow-hidden rounded-[1.5rem] bg-white shadow-soft"><div className="h-36" style={{ background: station.image }} /><div className="p-5"><div className="flex justify-between gap-4"><button onClick={onSelect} className="text-left"><h3 className="font-display text-xl">{station.name}</h3><p className="mt-1 text-sm text-[#18332b]/60">{station.shortDescription}</p></button><button onClick={onFavorite} aria-label="Favorit" className="h-10 rounded-full p-2 hover:bg-black/5"><Heart fill={favorite ? "currentColor" : "none"} className={favorite ? "text-red-500" : ""} /></button></div><p className="mt-4 text-xs font-bold text-[var(--primary)]">● {statusLabel[station.status]} · {station.openingHours}</p></div></article>;
}

function ModuleCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl bg-white p-5 shadow-soft"><div className="mb-3 flex items-center gap-2 text-[var(--primary)]">{icon}<h2 className="font-display text-2xl text-[#18332b]">{title}</h2></div><div className="space-y-3">{children}</div></section>;
}

function CompactItem({ title, text }: { title: string; text: string }) {
  return <article className="rounded-xl bg-[#f7f4ed] p-3"><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm leading-5 text-[#18332b]/60">{text}</p></article>;
}

const occupancyLabel = {
  free: "Frei",
  busy: "Gut besucht",
  full: "Voll",
  closed: "Geschlossen"
};

function StationSheet({ station, favorite, checkinsEnabled, checkedIn, onFavorite, onCheckin, onClose }: { station: Station; favorite: boolean; checkinsEnabled: boolean; checkedIn: boolean; onFavorite: () => void; onCheckin: () => void; onClose: () => void }) {
  return <div className="fixed inset-0 z-40 flex items-end bg-black/35 p-2 sm:items-center sm:justify-center" onClick={onClose}><article onClick={(event) => event.stopPropagation()} className="animate-enter max-h-[90vh] w-full max-w-lg overflow-auto rounded-[2rem] bg-white shadow-2xl"><div className="relative h-52" style={{ background: station.image }}><button onClick={onClose} aria-label="Schließen" className="absolute right-4 top-4 rounded-full bg-white p-2 shadow"><X /></button></div><div className="p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[var(--primary)]">{statusLabel[station.status]}</p><h2 className="mt-1 font-display text-3xl">{station.name}</h2></div><button onClick={onFavorite} className="rounded-full border p-3"><Heart fill={favorite ? "currentColor" : "none"} className={favorite ? "text-red-500" : ""} /></button></div><p className="mt-4 leading-7 text-[#18332b]/70">{station.description}</p><div className="mt-5 rounded-2xl bg-[var(--surface)] p-4 text-sm"><strong>Öffnungszeiten</strong><p className="mt-1 text-[#18332b]/65">{station.openingHours}</p></div><div className="mt-5 grid gap-2">{checkinsEnabled && <button onClick={onCheckin} disabled={checkedIn} className="rounded-xl border border-black/10 px-5 py-3.5 font-bold disabled:opacity-60">{checkedIn ? "Bereits eingecheckt" : "Hier einchecken"}</button>}<a href={`https://www.openstreetmap.org/directions?to=${station.latitude},${station.longitude}`} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3.5 font-bold text-white"><Navigation size={19} /> Navigation</a></div></div></article></div>;
}

function getDeviceId() {
  const key = "platzguide-device-id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const next = crypto.randomUUID();
  localStorage.setItem(key, next);
  return next;
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}
