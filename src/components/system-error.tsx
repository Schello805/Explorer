import Link from "next/link";

export function SystemError({ title, message }: { title: string; message: string }) {
  return <main className="min-h-dvh overflow-x-hidden bg-[radial-gradient(circle_at_top_right,#dcebdd_0,#f2f3ef_32%,#f8f5ec_100%)] px-4 py-8 text-[#18332b] sm:px-[5%] sm:py-12">
    <section className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-xl items-center">
      <div className="w-full rounded-[2rem] bg-white/95 p-6 shadow-soft ring-1 ring-black/5 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4c564]/20 text-2xl" aria-hidden="true">
          ⏳
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-[#c9653d]">Platzguide Hinweis</p>
        <h1 className="mt-3 max-w-sm font-display text-4xl leading-[.98] sm:text-5xl">{title}</h1>
        <p className="mt-5 text-lg leading-8 text-[#18332b]/70">{message}</p>
        <div className="mt-6 rounded-3xl bg-[#f7f4ed] p-5">
          <p className="font-bold">Was du jetzt tun kannst</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[#18332b]/70">
            <li>• Seite in ein paar Minuten erneut öffnen.</li>
            <li>• QR-Code oder Link vom Campingplatz noch einmal scannen.</li>
            <li>• Bei Fragen direkt an der Rezeption nachfragen.</li>
          </ul>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a className="rounded-2xl bg-[#124333] px-5 py-4 text-center font-bold text-white shadow-sm transition hover:bg-[#0d3328]" href=".">
            Erneut versuchen
          </a>
          <Link className="rounded-2xl border border-black/10 bg-white px-5 py-4 text-center font-bold text-[#18332b] transition hover:bg-[#f7f4ed]" href="/">
            Platzguide öffnen
          </Link>
        </div>
      </div>
    </section>
  </main>;
}
