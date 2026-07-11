"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ArrowRight, HelpCircle, KeyRound } from "lucide-react";

const platformLogo = "/icons/platzguide-logo.png";

export default function LoginPage() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#173c32] p-4 text-white">Anmeldung wird geladen …</main>}><LoginContent /></Suspense>;
}

function LoginContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot" | "reset">("login");
  const resetToken = searchParams.get("reset") ?? "";
  const activeMode = resetToken ? "reset" : mode;
  const queryNotice = searchParams.get("verified") === "1" ? "E-Mail bestätigt. Du kannst dich jetzt anmelden." : "";
  const queryError = searchParams.get("verified") === "failed" ? "Der Bestätigungslink ist ungültig oder abgelaufen." : "";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") })
    });
    if (response.ok) window.location.href = "/admin";
    else {
      const body = await response.json();
      setError(body.error);
      setLoading(false);
    }
  }

  async function requestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email") })
    });
    setLoading(false);
    setNotice("Wenn die E-Mail-Adresse existiert, wurde ein Reset-Link versendet.");
    setMode("login");
  }

  async function resetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: resetToken, password: form.get("password") })
    });
    setLoading(false);
    if (response.ok) {
      setNotice("Passwort geändert. Du kannst dich jetzt anmelden.");
      setMode("login");
      window.history.replaceState({}, "", "/admin/login");
    } else {
      const body = await response.json();
      setError(body.error);
    }
  }

  return <main className="grid min-h-screen bg-[#173c32] p-4 lg:grid-cols-2">
    <section className="hidden flex-col justify-between rounded-[2rem] bg-[#e8b65f] p-10 lg:flex">
      <a href="https://platzguide.de" className="w-fit"><Image src={platformLogo} alt="Platzguide" width={80} height={80} className="h-20 w-20 object-contain" priority /></a><div><p className="text-xs font-bold uppercase tracking-[.2em]">Platzguide Plattform</p><h1 className="mt-4 max-w-xl font-display text-6xl">Ein Ort für alle deine Campingplätze.</h1></div><p className="text-sm opacity-65">Sicher · Mandantenfähig · Zentral verwaltet</p>
    </section>
    <section className="grid place-items-center px-4 py-10">
      {activeMode === "login" && <form onSubmit={submit} className="w-full max-w-md text-white">
        <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-white/10"><KeyRound /></span>
        <p className="mt-8 text-xs font-bold uppercase tracking-[.2em] text-[#e8b65f]">Adminbereich</p>
        <h2 className="mt-2 font-display text-5xl">Willkommen zurück.</h2>
        <p className="mt-3 text-sm leading-6 text-white/55">Melde dich an, um Plattform und Campingplätze zentral zu verwalten.</p>
        <label className="mt-8 block text-sm font-bold"><LabelText label="E-Mail" tooltip="Die E-Mail-Adresse deines Plattform- oder Betreiberzugangs." /><input name="email" title="Die E-Mail-Adresse deines Plattform- oder Betreiberzugangs." type="email" placeholder="admin@example.de" required className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 outline-none" /></label>
        <label className="mt-4 block text-sm font-bold"><LabelText label="Passwort" tooltip="Das Passwort, das bei Installation oder Einladung für diesen Zugang gesetzt wurde." /><input name="password" title="Das Passwort, das bei Installation oder Einladung für diesen Zugang gesetzt wurde." type="password" required minLength={8} className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 outline-none" /></label>
        {(notice || queryNotice) && <p role="status" className="mt-4 rounded-xl bg-emerald-400/15 p-3 text-sm text-emerald-100">{notice || queryNotice}</p>}
        {(error || queryError) && <p role="alert" className="mt-4 rounded-xl bg-red-400/15 p-3 text-sm text-red-200">{error || queryError}</p>}
        <button disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#e8b65f] px-5 py-3.5 font-bold text-[#173c32] disabled:opacity-60">{loading ? "Anmeldung läuft …" : "Sicher anmelden"} <ArrowRight size={18} /></button>
        <button type="button" onClick={() => { setError(""); setNotice(""); setMode("forgot"); }} className="mt-4 text-sm font-bold text-white/70 underline-offset-4 hover:text-white hover:underline">Passwort vergessen?</button>
      </form>}
      {activeMode === "forgot" && <form onSubmit={requestReset} className="w-full max-w-md text-white">
        <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-white/10"><KeyRound /></span>
        <p className="mt-8 text-xs font-bold uppercase tracking-[.2em] text-[#e8b65f]">Passwort</p>
        <h2 className="mt-2 font-display text-5xl">Reset-Link senden.</h2>
        <p className="mt-3 text-sm leading-6 text-white/55">Für Mandanten-Admins senden wir einen Link zum Zurücksetzen des Passworts.</p>
        <label className="mt-8 block text-sm font-bold"><LabelText label="E-Mail" tooltip="E-Mail-Adresse deines Mandanten-Adminzugangs." /><input name="email" title="E-Mail-Adresse deines Mandanten-Adminzugangs." type="email" required className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 outline-none" /></label>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-400/15 p-3 text-sm text-red-200">{error}</p>}
        <button disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#e8b65f] px-5 py-3.5 font-bold text-[#173c32] disabled:opacity-60">{loading ? "Wird gesendet …" : "Reset-Link senden"} <ArrowRight size={18} /></button>
        <button type="button" onClick={() => { setError(""); setMode("login"); }} className="mt-4 text-sm font-bold text-white/70 underline-offset-4 hover:text-white hover:underline">Zurück zur Anmeldung</button>
      </form>}
      {activeMode === "reset" && <form onSubmit={resetPassword} className="w-full max-w-md text-white">
        <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-white/10"><KeyRound /></span>
        <p className="mt-8 text-xs font-bold uppercase tracking-[.2em] text-[#e8b65f]">Sicherheit</p>
        <h2 className="mt-2 font-display text-5xl">Neues Passwort.</h2>
        <p className="mt-3 text-sm leading-6 text-white/55">Wähle ein neues Passwort mit mindestens 12 Zeichen.</p>
        <label className="mt-8 block text-sm font-bold"><LabelText label="Neues Passwort" tooltip="Mindestens 12 Zeichen. Verwende ein eigenes, starkes Passwort." /><input name="password" title="Mindestens 12 Zeichen. Verwende ein eigenes, starkes Passwort." type="password" required minLength={12} className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 outline-none" /></label>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-400/15 p-3 text-sm text-red-200">{error}</p>}
        <button disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#e8b65f] px-5 py-3.5 font-bold text-[#173c32] disabled:opacity-60">{loading ? "Wird gespeichert …" : "Passwort speichern"} <ArrowRight size={18} /></button>
      </form>}
    </section>
  </main>;
}

function LabelText({ label, tooltip }: { label: string; tooltip: string }) {
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
  return <span className="flex items-center gap-1.5">{label}<span ref={wrapperRef} className="relative inline-flex text-[#e8b65f]">
    <button type="button" aria-label="Hilfe anzeigen" onClick={(event) => { event.stopPropagation(); setOpen((value) => !value); }} className="rounded-full p-0.5 text-[#e8b65f]"><HelpCircle size={15} aria-hidden="true" /></button>
    {open && <span className="absolute left-1/2 top-7 z-30 w-64 max-w-[80vw] -translate-x-1/2 rounded-xl bg-white p-3 text-xs font-normal leading-5 text-[#173c32] shadow-xl">{tooltip}</span>}
  </span></span>;
}
