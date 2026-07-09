"use client";

import { useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(!localStorage.getItem("explorer-consent")), 0);
    const open = () => setVisible(true);
    document.querySelector("[data-open-consent]")?.addEventListener("click", open);
    return () => {
      window.clearTimeout(timer);
      document.querySelector("[data-open-consent]")?.removeEventListener("click", open);
    };
  }, []);

  function save(value: "essential" | "all") {
    localStorage.setItem("explorer-consent", JSON.stringify({ value, savedAt: new Date().toISOString() }));
    setVisible(false);
  }

  if (!visible) return null;
  return (
    <div role="dialog" aria-label="Cookie-Einstellungen" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-[1.75rem] bg-white p-5 shadow-2xl ring-1 ring-black/10 animate-enter sm:p-6">
      <button onClick={() => setVisible(false)} aria-label="Schließen" className="absolute right-4 top-4 rounded-full p-2 hover:bg-black/5"><X size={18} /></button>
      <div className="flex items-center gap-3"><span className="rounded-xl bg-[#f1a94b]/20 p-2 text-[#8a5513]"><Cookie /></span><h2 className="font-display text-xl">Deine Privatsphäre</h2></div>
      <p className="mt-3 pr-4 text-sm leading-6 text-[#18332b]/70">Notwendige Speicherungen halten die App funktionsfähig. Anonyme Statistik wird nur mit deiner Einwilligung aktiviert.</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button onClick={() => save("essential")} className="rounded-xl border border-[#18332b]/15 px-4 py-3 text-sm font-bold">Nur notwendige</button>
        <button onClick={() => save("all")} className="rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-bold text-white">Alle akzeptieren</button>
      </div>
    </div>
  );
}
