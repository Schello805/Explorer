import { WifiOff } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return <main className="grid min-h-screen place-items-center p-6 text-center"><div><WifiOff className="mx-auto text-[var(--primary)]" size={48} /><h1 className="mt-5 font-display text-4xl">Gerade offline</h1><p className="mt-3 text-[#18332b]/65">Bereits besuchte Inhalte bleiben verfügbar. Sobald du wieder Empfang hast, aktualisiert sich die Karte automatisch.</p><Link href="/" className="mt-6 inline-block rounded-xl bg-[var(--primary)] px-5 py-3 font-bold text-white">Erneut versuchen</Link></div></main>;
}
