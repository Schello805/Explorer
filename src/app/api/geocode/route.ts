import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const nominatimResultSchema = z.object({
  display_name: z.string(),
  lat: z.string(),
  lon: z.string(),
  boundingbox: z.array(z.string()).optional()
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  if (query.length < 3) return NextResponse.json({ results: [] });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limited = rateLimit(`geocode:${ip}`, 30, 60 * 1000);
  if (!limited.ok) return NextResponse.json({ error: "Zu viele Suchanfragen. Bitte kurz warten." }, { status: 429 });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: "5",
    countrycodes: "de,at,ch,nl,be,fr,it,dk,pl,cz"
  })}`, {
    headers: {
      "Accept": "application/json",
      "User-Agent": `Platzguide/${process.env.NEXT_PUBLIC_APP_REVISION ?? "dev"} (${process.env.MAIL_FROM ?? "info@platzguide.de"})`
    },
    next: { revalidate: 60 * 60 * 24 }
  });

  if (!response.ok) return NextResponse.json({ error: "Adresssuche ist gerade nicht erreichbar." }, { status: 502 });
  const parsed = z.array(nominatimResultSchema).safeParse(await response.json());
  if (!parsed.success) return NextResponse.json({ results: [] });

  return NextResponse.json({
    results: parsed.data.map((result) => ({
      label: result.display_name,
      center: [Number(result.lon), Number(result.lat)] as [number, number],
      bounds: parseNominatimBounds(result.boundingbox)
    })).filter((result) => Number.isFinite(result.center[0]) && Number.isFinite(result.center[1]))
  });
}

function parseNominatimBounds(value: string[] | undefined) {
  if (!value || value.length !== 4) return undefined;
  const [south, north, west, east] = value.map(Number);
  if (![south, north, west, east].every(Number.isFinite)) return undefined;
  return [[west, south], [east, north]] as [[number, number], [number, number]];
}
