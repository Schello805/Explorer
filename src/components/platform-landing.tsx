"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Camera, CheckCircle2, CreditCard, HelpCircle, LifeBuoy } from "lucide-react";
import { billingPlans, formatEuro, setupServicePriceCents, yearlyDiscountPercent } from "@/lib/billing";
import { CampMap } from "@/components/camp-map";
import type { Station, Tenant } from "@/lib/types";

type CaptchaProvider = "turnstile" | "hcaptcha" | "recaptcha" | "disabled";
const platformLogo = "/icons/platzguide-logo.png";

export function PlatformLanding({ allowSignup, captchaProvider, captchaSiteKey, demoTenant }: { allowSignup: boolean; captchaProvider: CaptchaProvider; captchaSiteKey: string; demoTenant?: Tenant }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [website, setWebsite] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [result, setResult] = useState<{ localUrl: string; publicUrl: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function createInstance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowSignup) {
      setError("Registrierung ist aktuell noch nicht geöffnet.");
      return;
    }
    setError("");
    setLoading(true);
    const response = await fetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, ownerEmail, ownerPassword, captchaToken, website })
    });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) return setError(payload.error ?? "Instanz konnte nicht erstellt werden.");
    setResult(payload);
  }

  useEffect(() => {
    if (!allowSignup || captchaProvider === "disabled" || !captchaSiteKey) return;
    const callbackHost = window as Window & { platzguideCaptchaSolved?: (token: string) => void };
    callbackHost.platzguideCaptchaSolved = setCaptchaToken;
    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.src = captchaProvider === "turnstile"
      ? "https://challenges.cloudflare.com/turnstile/v0/api.js"
      : captchaProvider === "hcaptcha"
        ? "https://js.hcaptcha.com/1/api.js"
        : "https://www.google.com/recaptcha/api.js";
    document.head.appendChild(script);
    return () => {
      delete callbackHost.platzguideCaptchaSolved;
      script.remove();
    };
  }, [allowSignup, captchaProvider, captchaSiteKey]);

  const signupSteps = [
    { label: "Profil", done: Boolean(name && slug) },
    { label: "Admin", done: Boolean(ownerEmail && ownerPassword.length >= 12) },
    { label: "Livegang", done: Boolean(result) }
  ];
  const completedSteps = signupSteps.filter((step) => step.done).length;
  const revision = process.env.NEXT_PUBLIC_APP_REVISION ?? "dev";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Platzguide",
    applicationCategory: "TravelApplication",
    operatingSystem: "Web, iOS, Android",
    description: "Mobile-first PWA und Adminplattform für Campingplätze mit Platzguide-Link, Stationen, Gästemappe und mandantengetrennter Verwaltung.",
    offers: [
      { "@type": "Offer", name: "Starter", price: "4.99", priceCurrency: "EUR" },
      { "@type": "Offer", name: "Pro", price: "19.99", priceCurrency: "EUR" }
    ]
  };

  return <main className="min-h-screen overflow-x-hidden bg-[#f5f2e9] text-[#18332b]">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <section className="mx-auto grid min-h-screen w-[min(90%,1180px)] content-center gap-6 py-7 sm:gap-8 sm:py-10 lg:grid-cols-[1fr_.82fr] lg:items-center">
      <div className="min-w-0">
        <a href="https://platzguide.de" className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-[#195f4c] shadow-sm"><Image src={platformLogo} alt="" width={20} height={20} className="h-5 w-5 object-contain" /> Platzguide</a>
        <h1 className="mt-5 max-w-3xl break-words font-display text-[clamp(2.35rem,10vw,4.8rem)] leading-[1.02]">Dein digitaler Campingplatz-Guide in wenigen Minuten.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#18332b]/65">Platzguide ist die mobile-first PWA für Campingplätze: Stationen, Platzplan, Gästemappe, Events, Rechtstexte und Adminbereich — getrennt je Mandant und erreichbar über einen einfachen Platzguide-Link.</p>
        <p className="mt-3 max-w-2xl rounded-xl bg-white/85 p-3 text-sm font-bold leading-6 text-[#195f4c]">Kostenlos einrichten und testen. Sobald dein Platzguide bereit ist, kannst du ihn veröffentlichen.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <WorkflowStep number="1" title="Instanz erstellen" text="Name, Link-Kürzel und Adminzugang festlegen." />
          <WorkflowStep number="2" title="Platz einrichten" text="Stationen, Karte, Medien und Rechtstexte pflegen." />
          <WorkflowStep number="3" title="Live gehen" text="Veröffentlichen, wenn Inhalte und Paket bereit sind." />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href="#preise" className="rounded-xl bg-[#195f4c] px-5 py-3 text-sm font-bold text-white">Preise ansehen</a>
          <a href="#demo" className="rounded-xl border border-[#195f4c]/20 bg-white px-5 py-3 text-sm font-bold text-[#195f4c]">Demo ansehen</a>
        </div>
      </div>

      <form onSubmit={createInstance} className="rounded-[2rem] bg-white p-5 shadow-soft sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#195f4c]/60">Neue Instanz</p><h2 className="mt-2 font-display text-3xl">Campingplatz anlegen</h2></div>
          <span className="rounded-full bg-[#eef4ed] px-3 py-1 text-xs font-bold text-[#195f4c]">{completedSteps}/3</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">{signupSteps.map((step) => <div key={step.label} className="rounded-xl bg-[#f7f4ed] p-2 text-xs font-bold"><CheckCircle2 size={15} className={step.done ? "text-emerald-600" : "text-black/20"} />{step.label}</div>)}</div>
        <p className="mt-3 rounded-xl bg-[#f7f4ed] p-3 text-sm leading-5 text-[#18332b]/65">Du kannst alles vorbereiten, prüfen und später mit deinem gewählten Paket veröffentlichen.</p>
        <div className="mt-5 space-y-4">
          <Field label="Name der App" tooltip="Der sichtbare Name deines Campingplatz-Guides, z. B. Platzguide Demo." value={name} onChange={setName} />
          <Field label="Link-Kürzel" tooltip="Kurzer, eindeutiger Link ohne Leerzeichen. Daraus wird platzguide.de/c/dein-kuerzel." value={slug} onChange={(value) => setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} prefix="/c/" />
          <Field label="Admin-E-Mail" tooltip="E-Mail-Adresse für den späteren Verwaltungszugang dieses Campingplatzes." value={ownerEmail} onChange={setOwnerEmail} />
          <Field label="Admin-Passwort" tooltip="Mindestens 12 Zeichen. Verwende ein eigenes, starkes Passwort." type="password" value={ownerPassword} onChange={setOwnerPassword} />
          <label className="hidden">Website<input title="Spam-Schutzfeld. Bitte leer lassen." value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" /></label>
          {allowSignup && captchaProvider !== "disabled" && captchaSiteKey && <div className="captcha-frame overflow-hidden rounded-xl">
            {captchaProvider === "turnstile"
              ? <div className="cf-turnstile" data-sitekey={captchaSiteKey} data-callback="platzguideCaptchaSolved" />
              : captchaProvider === "hcaptcha"
                ? <div className="h-captcha" data-sitekey={captchaSiteKey} data-callback="platzguideCaptchaSolved" />
                : <div className="g-recaptcha" data-sitekey={captchaSiteKey} data-callback="platzguideCaptchaSolved" />}
          </div>}
        </div>
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        {result && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900"><strong>Erstellt:</strong><br /><a className="font-bold underline" href={result.localUrl}>Platzguide öffnen</a><br />Dein Platzguide-Link: {result.publicUrl}</div>}
        <button disabled={loading || !allowSignup} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#195f4c] px-5 py-3.5 font-bold text-white disabled:opacity-60">{loading ? "Wird erstellt …" : allowSignup ? "Instanz erstellen" : "Registrierung bald verfügbar"} <ArrowRight size={18} /></button>
      </form>
    </section>
    <section id="preise" className="mx-auto w-[min(90%,1180px)] scroll-mt-8 pb-12">
      <div className="rounded-[2rem] bg-[#18332b] p-5 text-white sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#e8b65f]">Preise</p>
        <h2 className="mt-2 font-display text-4xl">Einfach starten, flexibel wachsen.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">Monatlich kündbar, {yearlyDiscountPercent}% Jahresrabatt bei Jahreszahlung. Die optionale Einrichtung durch Michael kostet einmalig {formatEuro(setupServicePriceCents)}.</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <PriceCard title="Starter" price={billingPlans.starter.monthlyPriceCents} badge="Für die meisten Plätze" lines={["100 MB Speicher für Bilder/kurze Medien", "Support innerhalb von 24 Stunden", "Platzguide-Link inklusive", "Veröffentlichung inklusive"]} />
          <PriceCard title="Pro" price={billingPlans.pro.monthlyPriceCents} badge="Für wachsende Teams" lines={["1 GB Speicher", "Support innerhalb von 6 Stunden", "Mehrere Admins und künftige Pro-Module", "Eigene Domain möglich"]} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <MiniFeature icon={<CreditCard />} title="Veröffentlichung steuern" text="Du entscheidest, wann dein Platzguide bereit für Gäste ist." />
          <MiniFeature icon={<LifeBuoy />} title="Support klar geregelt" text="Starter: 24h Reaktionszeit. Pro: 6h Reaktionszeit." />
        </div>
      </div>
    </section>

    <section id="demo" className="mx-auto w-[min(90%,1180px)] scroll-mt-8 pb-12">
      <div className="grid gap-6 rounded-[2rem] bg-white p-5 shadow-soft lg:grid-cols-[.75fr_1.25fr] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#195f4c]/65">Demo</p>
          <h2 className="mt-2 font-display text-[clamp(2rem,8vw,3.6rem)] leading-[1.02]">So sehen Gäste deinen Platzguide.</h2>
          <p className="mt-3 text-sm leading-6 text-[#18332b]/60">Probiere die echte Besucherkarte aus. Marker, Kartenausschnitt und Stationspositionen stammen direkt aus dem veröffentlichten DEMO-Platzguide.</p>
        </div>
        <DemoVisitorPreview tenant={demoTenant} />
      </div>
    </section>

    <section id="screenshots" className="mx-auto w-[min(90%,1180px)] scroll-mt-8 pb-12">
      <div className="rounded-[2rem] bg-[#efe8d9] p-5 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#195f4c]/65">Screenshots</p>
        <h2 className="mt-2 font-display text-[clamp(2rem,8vw,3.6rem)] leading-[1.02]">Platz für App-Bilder und Beispiele.</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <ScreenshotSlot title="Besucher-App" text="Karte, Liste und Stationsdetails." />
          <ScreenshotSlot title="Adminbereich" text="Stationen, Medien und Veröffentlichung." />
          <ScreenshotSlot title="Mobile Ansicht" text="Optimiert für Smartphone-Gäste." />
        </div>
      </div>
    </section>

    <footer className="mx-auto flex w-[min(90%,1180px)] flex-col gap-3 border-t border-[#18332b]/10 py-6 text-sm text-[#18332b]/55 sm:flex-row sm:items-center sm:justify-between">
      <p>© Michael Schellenberger · Platzguide · Version v{revision}</p>
      <nav className="flex flex-wrap gap-x-5 gap-y-2">
        <Link href="/rechtliches/impressum">Impressum</Link>
        <Link href="/rechtliches/datenschutz">Datenschutz</Link>
        <Link href="/rechtliches/cookies">Cookies</Link>
        <Link href="/rechtliches/agb">AGB</Link>
      </nav>
    </footer>
  </main>;
}

function MiniFeature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="rounded-2xl bg-white p-4 text-[#18332b] shadow-sm"><div className="text-[#195f4c]">{icon}</div><p className="mt-3 font-bold">{title}</p><p className="mt-1 text-sm text-[#18332b]/55">{text}</p></div>;
}

function DemoVisitorPreview({ tenant }: { tenant?: Tenant }) {
  const [selected, setSelected] = useState<Station | null>(null);
  if (!tenant) {
    return <div className="grid min-h-80 place-items-center rounded-[1.7rem] border border-[#18332b]/10 bg-[#f5f2e9] p-6 text-center shadow-sm">
      <div className="max-w-sm">
        <Image src={platformLogo} alt="" width={52} height={52} className="mx-auto h-13 w-13 rounded-2xl bg-white p-2 object-contain shadow-sm" />
        <h3 className="mt-4 font-display text-3xl">Die Live-Demo wird vorbereitet.</h3>
        <p className="mt-2 text-sm leading-6 text-[#18332b]/60">Sobald der veröffentlichte Mandant „DEMO“ eingerichtet ist, erscheint seine interaktive Karte automatisch hier.</p>
      </div>
    </div>;
  }
  const stations = tenant.stations.filter((station) => !station.isTemplate);
  const theme = {
    "--primary": tenant.theme.primary,
    "--secondary": tenant.theme.secondary,
    "--surface": tenant.theme.surface
  } as CSSProperties;
  return <div data-testid="landing-demo-map" className="min-w-0 overflow-hidden rounded-[1.7rem] border border-[#18332b]/10 bg-[#f5f2e9] p-3 shadow-sm sm:p-4" style={theme}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Image src={platformLogo} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-xl bg-white p-1.5 object-contain shadow-sm" />
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#195f4c]/55">Echte Besucherkarte</p><p className="truncate font-display text-xl">{tenant.name}</p></div>
      </div>
      <Link href={`/c/${tenant.slug}`} className="inline-flex items-center gap-2 rounded-xl bg-[#195f4c] px-4 py-2.5 text-sm font-bold text-white">Demo öffnen <ArrowRight size={16} /></Link>
    </div>
    <CampMap tenant={tenant} stations={stations} selected={selected} onSelect={setSelected} />
    {selected && <div className="mt-3 flex items-start justify-between gap-3 rounded-2xl bg-white p-4">
      <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-widest text-[#195f4c]">Ausgewählte Station</p><h3 className="mt-1 font-display text-2xl">{selected.name}</h3><p className="mt-1 text-sm leading-5 text-[#18332b]/60">{selected.shortDescription}</p></div>
      <button type="button" onClick={() => setSelected(null)} className="shrink-0 rounded-lg border border-[#18332b]/10 px-3 py-2 text-xs font-bold">Schließen</button>
    </div>}
  </div>;
}

function ScreenshotSlot({ title, text }: { title: string; text: string }) {
  return <article className="rounded-2xl bg-white p-4 shadow-sm">
    <div className="grid aspect-[4/3] place-items-center rounded-xl bg-gradient-to-br from-[#195f4c]/10 to-[#e8b65f]/20 text-[#195f4c]"><Camera size={34} /></div>
    <h3 className="mt-4 font-bold">{title}</h3>
    <p className="mt-1 text-sm text-[#18332b]/55">{text}</p>
  </article>;
}

function WorkflowStep({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#195f4c] text-sm font-bold text-white">{number}</span><p className="mt-3 font-bold">{title}</p><p className="mt-1 text-sm leading-5 text-[#18332b]/55">{text}</p></div>;
}

function PriceCard({ title, price, badge, lines }: { title: string; price: number; badge: string; lines: string[] }) {
  return <article className="rounded-2xl bg-white p-5 text-[#18332b] shadow-sm">
    <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-widest text-[#195f4c]/60">{title}</p><span className="rounded-full bg-[#f4ead6] px-3 py-1 text-xs font-bold text-[#9a6420]">{badge}</span></div>
    <p className="mt-3 font-display text-5xl">{formatEuro(price)}</p>
    <p className="text-sm text-[#18332b]/45">pro Monat · monatlich kündbar</p>
    <ul className="mt-4 space-y-2 text-sm text-[#18332b]/70">{lines.map((line) => <li key={line} className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />{line}</li>)}</ul>
  </article>;
}

function Field({ label, tooltip, value, prefix, suffix, type = "text", onChange }: { label: string; tooltip: string; value: string; prefix?: string; suffix?: string; type?: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-bold"><span className="flex items-center gap-1.5">{label}<HelpBubble text={tooltip} /></span><div className="mt-2 flex rounded-xl border border-black/10 bg-[#fafaf8]">{prefix && <span className="shrink-0 border-r border-black/10 px-3 py-3 text-black/40">{prefix}</span>}<input required title={tooltip} aria-label={label} type={type} minLength={type === "password" ? 12 : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent px-4 py-3 outline-none" />{suffix && <span className="shrink-0 border-l border-black/10 px-3 py-3 text-black/40">{suffix}</span>}</div></label>;
}

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
  return <span ref={wrapperRef} className="relative inline-flex text-[#195f4c]">
    <button type="button" aria-label="Hilfe anzeigen" onClick={(event) => { event.stopPropagation(); setOpen((value) => !value); }} className="rounded-full p-0.5 text-[#195f4c]"><HelpCircle size={15} aria-hidden="true" /></button>
    {open && <span className="absolute left-1/2 top-7 z-30 w-64 max-w-[80vw] -translate-x-1/2 rounded-xl bg-[#18332b] p-3 text-xs font-normal leading-5 text-white shadow-xl">{text}</span>}
  </span>;
}
