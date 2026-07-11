import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Tenant } from "@/lib/types";

export const legalTitles = {
  impressum: "Impressum",
  datenschutz: "Datenschutz",
  cookies: "Cookie-Hinweise",
  agb: "Allgemeine Nutzungsbedingungen"
};

export type LegalDocument = keyof typeof legalTitles;

export function legalContent(tenant: Pick<Tenant, "legal">, key: LegalDocument) {
  return key === "impressum" ? tenant.legal.imprint : key === "datenschutz" ? tenant.legal.privacy : key === "cookies" ? tenant.legal.cookies : tenant.legal.terms;
}

export function LegalView({ tenant, document, backHref }: { tenant: Tenant; document: LegalDocument; backHref: string }) {
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-8"><Link href={backHref} className="inline-flex items-center gap-2 text-sm font-bold"><ArrowLeft size={18} /> Zurück</Link><h1 className="mt-12 font-display text-5xl">{legalTitles[document]}</h1><div className="mt-8 rounded-2xl bg-white p-6 leading-8 shadow-soft"><p className="whitespace-pre-line">{legalContent(tenant, document)}</p><h2 className="mt-8 font-display text-2xl">Kontakt</h2><p className="mt-2">{tenant.contact.email}<br />{tenant.contact.phone}</p></div></main>;
}
