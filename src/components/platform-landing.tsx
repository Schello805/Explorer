"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Image from "next/image";
import { ArrowRight, Code2, ShieldCheck, Smartphone } from "lucide-react";
import { billingPlans, formatEuro, setupServicePriceCents, yearlyDiscountPercent } from "@/lib/billing";

type CaptchaProvider = "turnstile" | "hcaptcha" | "disabled";
const platformLogo = "/icons/platzguide-logo.png";

export function PlatformLanding({ allowSignup, captchaProvider, captchaSiteKey }: { allowSignup: boolean; captchaProvider: CaptchaProvider; captchaSiteKey: string }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [website, setWebsite] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [result, setResult] = useState<{ localUrl: string; subdomain: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function createInstance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowSignup) {
      setError("Self-Service ist aus Sicherheitsgründen noch deaktiviert.");
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
      : "https://js.hcaptcha.com/1/api.js";
    document.head.appendChild(script);
    return () => {
      delete callbackHost.platzguideCaptchaSolved;
      script.remove();
    };
  }, [allowSignup, captchaProvider, captchaSiteKey]);

  return <main className="min-h-screen bg-[#f5f2e9] text-[#18332b]">
    <section className="mx-auto grid min-h-screen w-[90%] content-center gap-6 py-8 lg:grid-cols-[1fr_.9fr] lg:items-center">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-[#195f4c] shadow-sm"><Image src={platformLogo} alt="" width={20} height={20} className="h-5 w-5 object-contain" /> Platzguide Plattform</div>
        <h1 className="mt-5 max-w-2xl font-display text-4xl leading-[1.02] sm:text-6xl">Camping-App erstellen. Subdomain wählen. Inhalte pflegen.</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-[#18332b]/65">Mobile-first PWA für Campingplätze: Karte, Stationen, Gästemappe, Events und Adminbereich — pro Campingplatz strikt getrennt.</p>
        <p className="mt-3 max-w-xl rounded-xl bg-white/80 p-3 text-sm font-bold leading-6 text-[#195f4c]">Kostenlos einrichten und testen. Öffentlich sichtbar wird die Besucher-App erst nach manueller Freigabe.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <MiniFeature icon={<Smartphone />} title="Mobil zuerst" text="Für Gäste am Platz." />
          <MiniFeature icon={<ShieldCheck />} title="Getrennte Daten" text="Tenant-ID je Anfrage." />
          <MiniFeature icon={<Code2 />} title="Source Available" text="Nicht-kommerziell frei." />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="/admin" className="rounded-xl bg-[#195f4c] px-5 py-3 text-sm font-bold text-white">Admin öffnen</a>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <PriceCard title="Starter" price={billingPlans.starter.monthlyPriceCents} lines={["100 MB Speicher", "Support innerhalb 24h", "Subdomain inklusive"]} />
          <PriceCard title="Pro" price={billingPlans.pro.monthlyPriceCents} lines={["1 GB Speicher", "Support innerhalb 6h", "Mehrere Admins & künftige Module"]} />
        </div>
        <p className="mt-3 text-sm text-[#18332b]/55">Monatlich kündbar · {yearlyDiscountPercent}% Jahresrabatt · optionale Einrichtung durch Michael für {formatEuro(setupServicePriceCents)}.</p>
      </div>

      <form onSubmit={createInstance} className="rounded-[2rem] bg-white p-5 shadow-soft sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#195f4c]/60">Neue Instanz</p>
        <h2 className="mt-2 font-display text-3xl">Campingplatz anlegen</h2>
        <p className="mt-3 rounded-xl bg-[#f7f4ed] p-3 text-sm leading-5 text-[#18332b]/65">Du kannst alles vorbereiten und testen. Für anonyme Besucher bleibt die Subdomain gesperrt, bis sie manuell freigeschaltet wird.</p>
        {!allowSignup && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm leading-5 text-amber-900">Self-Service ist vorbereitet, aber standardmäßig geschlossen. Aktivierung erfolgt erst mit E-Mail-Verifikation, Rate-Limit und Nutzungsbedingungen.</p>}
        <div className="mt-5 space-y-4">
          <Field label="Name der App" value={name} onChange={setName} />
          <Field label="Subdomain" value={slug} onChange={(value) => setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} suffix=".app-domain.de" />
          <Field label="Admin-E-Mail" value={ownerEmail} onChange={setOwnerEmail} />
          <Field label="Admin-Passwort" type="password" value={ownerPassword} onChange={setOwnerPassword} />
          <label className="hidden">Website<input value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" /></label>
          {allowSignup && captchaProvider !== "disabled" && captchaSiteKey && <div className="overflow-hidden rounded-xl">
            {captchaProvider === "turnstile"
              ? <div className="cf-turnstile" data-sitekey={captchaSiteKey} data-callback="platzguideCaptchaSolved" />
              : <div className="h-captcha" data-sitekey={captchaSiteKey} data-callback="platzguideCaptchaSolved" />}
          </div>}
        </div>
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        {result && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900"><strong>Erstellt:</strong><br /><a className="font-bold underline" href={result.localUrl}>Lokale Instanz öffnen</a><br />Spätere Subdomain: {result.subdomain}</div>}
        <button disabled={loading || !allowSignup} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#195f4c] px-5 py-3.5 font-bold text-white disabled:opacity-60">{loading ? "Wird erstellt …" : allowSignup ? "Instanz erstellen" : "Self-Service geschlossen"} <ArrowRight size={18} /></button>
      </form>
    </section>
  </main>;
}

function MiniFeature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm"><div className="text-[#195f4c]">{icon}</div><p className="mt-3 font-bold">{title}</p><p className="mt-1 text-sm text-[#18332b]/55">{text}</p></div>;
}

function PriceCard({ title, price, lines }: { title: string; price: number; lines: string[] }) {
  return <article className="rounded-2xl bg-white p-4 shadow-sm">
    <p className="text-xs font-bold uppercase tracking-widest text-[#195f4c]/60">{title}</p>
    <p className="mt-2 font-display text-3xl">{formatEuro(price)}</p>
    <p className="text-xs text-[#18332b]/45">pro Monat</p>
    <ul className="mt-3 space-y-1 text-sm text-[#18332b]/65">{lines.map((line) => <li key={line}>✓ {line}</li>)}</ul>
  </article>;
}

function Field({ label, value, suffix, type = "text", onChange }: { label: string; value: string; suffix?: string; type?: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-bold">{label}<div className="mt-2 flex rounded-xl border border-black/10 bg-[#fafaf8]"><input required type={type} minLength={type === "password" ? 12 : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent px-4 py-3 outline-none" />{suffix && <span className="shrink-0 border-l border-black/10 px-3 py-3 text-black/40">{suffix}</span>}</div></label>;
}
