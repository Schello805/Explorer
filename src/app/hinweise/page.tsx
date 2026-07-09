import { ArrowLeft, HeartPulse, Moon, Phone, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { getTenant } from "@/lib/tenant";

export default async function NoticesPage() {
  const tenant = await getTenant();
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-8"><Link href="/" className="inline-flex items-center gap-2 text-sm font-bold"><ArrowLeft size={18} /> Zurück zur Karte</Link><p className="mt-12 text-xs font-bold uppercase tracking-[.2em] text-[var(--primary)]">Sicher unterwegs</p><h1 className="mt-2 font-display text-5xl">Hinweise & Hilfe</h1><div className="mt-8 grid gap-4"><Notice icon={<HeartPulse />} title="Notfall" text={`Im Notfall 112 anrufen. Platzkontakt: ${tenant.contact.emergency}`} /><Notice icon={<Moon />} title="Nachtruhe" text="Bitte zwischen 22:00 und 07:00 Uhr Rücksicht nehmen. Fahrzeuge bleiben in dieser Zeit stehen." /><Notice icon={<ShieldCheck />} title="Platzregeln" text="Kinder am Wasser beaufsichtigen, Hunde anleinen und offene Feuer nur an ausgewiesenen Stellen nutzen." /><Notice icon={<Phone />} title="Rezeption" text={`${tenant.contact.phone} · ${tenant.contact.email}`} /></div></main>;
}

function Notice({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <section className="rounded-2xl bg-white p-5 shadow-soft"><div className="flex items-center gap-3 text-[var(--primary)]">{icon}<h2 className="font-display text-2xl text-[#18332b]">{title}</h2></div><p className="mt-3 leading-7 text-[#18332b]/65">{text}</p></section>;
}
