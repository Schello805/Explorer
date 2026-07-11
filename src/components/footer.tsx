import Link from "next/link";
import type { Tenant } from "@/lib/types";

export function Footer({ tenant, basePath = "" }: { tenant: Tenant; basePath?: string }) {
  const revision = process.env.NEXT_PUBLIC_APP_REVISION ?? "dev";
  const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/Schello805/Explorer";

  return (
    <footer className="border-t border-[#18332b]/10 bg-[#18332b] py-6 text-[#f9f5eb]">
      <div className="mx-auto grid w-[90%] gap-4 md:grid-cols-2">
        <div>
          <p className="font-display text-2xl">{tenant.name}</p>
          <p className="mt-2 max-w-md text-sm text-white/65">{tenant.tagline}</p>
        </div>
        <nav aria-label="Rechtliches" className="flex flex-wrap content-start gap-x-6 gap-y-3 text-sm md:justify-end">
          <Link href={`${basePath}/rechtliches/impressum`}>Impressum</Link>
          <Link href={`${basePath}/rechtliches/datenschutz`}>Datenschutz</Link>
          <Link href={`${basePath}/rechtliches/cookies`}>Cookie-Hinweise</Link>
          <Link href={`${basePath}/rechtliches/agb`}>AGB</Link>
          <button className="text-left" data-open-consent>Einwilligung ändern</button>
        </nav>
      </div>
      <div className="mx-auto mt-4 flex w-[90%] flex-col gap-3 border-t border-white/10 pt-4 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
        <a href={githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-white">
          <GitHubIcon /> Open Source von Michael Schellenberger
        </a>
        <span>Revision {revision}</span>
      </div>
    </footer>
  );
}

function GitHubIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 .7a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.57-.3-5.27-1.29-5.27-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.16 1.18a10.9 10.9 0 0 1 5.76 0c2.19-1.49 3.15-1.18 3.15-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.71 5.39-5.29 5.68.42.36.79 1.06.79 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z"/></svg>;
}
