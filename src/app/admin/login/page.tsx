"use client";

import { useState } from "react";
import { ArrowRight, KeyRound, TentTree } from "lucide-react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  return <main className="grid min-h-screen bg-[#173c32] p-4 lg:grid-cols-2">
    <section className="hidden flex-col justify-between rounded-[2rem] bg-[#e8b65f] p-10 lg:flex">
      <TentTree size={44} /><div><p className="text-xs font-bold uppercase tracking-[.2em]">Entdecker Plattform</p><h1 className="mt-4 max-w-xl font-display text-6xl">Ein Ort für alle deine Campingplätze.</h1></div><p className="text-sm opacity-65">Sicher · Mandantenfähig · Zentral verwaltet</p>
    </section>
    <section className="grid place-items-center px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md text-white">
        <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-white/10"><KeyRound /></span>
        <p className="mt-8 text-xs font-bold uppercase tracking-[.2em] text-[#e8b65f]">Nur für Michael</p>
        <h2 className="mt-2 font-display text-5xl">Willkommen zurück.</h2>
        <p className="mt-3 text-sm leading-6 text-white/55">Melde dich an, um Plattform und Campingplätze zentral zu verwalten.</p>
        <label className="mt-8 block text-sm font-bold">E-Mail<input name="email" type="email" defaultValue="admin@schellenberger.biz" required className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 outline-none" /></label>
        <label className="mt-4 block text-sm font-bold">Passwort<input name="password" type="password" required minLength={8} className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 outline-none" /></label>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-400/15 p-3 text-sm text-red-200">{error}</p>}
        <button disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#e8b65f] px-5 py-3.5 font-bold text-[#173c32] disabled:opacity-60">{loading ? "Anmeldung läuft …" : "Sicher anmelden"} <ArrowRight size={18} /></button>
        {process.env.NODE_ENV !== "production" && <p className="mt-4 text-xs text-white/35">Lokaler Entwicklungszugang: entdeck­er-admin (ohne Trennzeichen: entdecker-admin)</p>}
      </form>
    </section>
  </main>;
}
