export function SystemError({ title, message }: { title: string; message: string }) {
  return <main className="min-h-screen bg-[#f2f3ef] px-[5%] py-12 text-[#18332b]">
    <section className="mx-auto max-w-2xl rounded-3xl bg-white p-6 shadow-soft">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[#c9653d]">Platzguide Systemhinweis</p>
      <h1 className="mt-3 font-display text-4xl">{title}</h1>
      <p className="mt-4 leading-7 text-[#18332b]/70">{message}</p>
      <div className="mt-6 rounded-2xl bg-[#f7f4ed] p-4 text-sm leading-6">
        <p className="font-bold">Server prüfen</p>
        <p><code>journalctl -u platzguide -n 100 --no-pager</code></p>
        <p><code>sudo FORCE_REBUILD=true bash /opt/platzguide/scripts/update-ubuntu.sh</code></p>
      </div>
    </section>
  </main>;
}
