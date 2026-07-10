import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTenant } from "@/lib/tenant";

const titles = { impressum: "Impressum", datenschutz: "Datenschutz", cookies: "Cookie-Hinweise" };

export default async function LegalPage({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params;
  if (!(document in titles)) notFound();
  const tenant = await getTenant();
  const key = document as keyof typeof titles;
  const content = key === "impressum" ? tenant.legal.imprint : key === "datenschutz" ? tenant.legal.privacy : tenant.legal.cookies;
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-8"><Link href="/" className="inline-flex items-center gap-2 text-sm font-bold"><ArrowLeft size={18} /> Zurück</Link><h1 className="mt-12 font-display text-5xl">{titles[key]}</h1><div className="mt-8 rounded-2xl bg-white p-6 leading-8 shadow-soft"><p className="whitespace-pre-line">{content}</p><h2 className="mt-8 font-display text-2xl">Kontakt</h2><p className="mt-2">{tenant.contact.email}<br />{tenant.contact.phone}</p><p className="mt-8 text-xs text-[#18332b]/55">Hinweis: Diese mandantenspezifischen Angaben müssen vor dem Produktivbetrieb durch rechtlich geprüfte Volltexte ersetzt werden.</p></div></main>;
}
