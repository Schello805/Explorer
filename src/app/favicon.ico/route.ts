const faviconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#195f4c"/>
  <rect x="14" y="20" width="36" height="22" rx="6" fill="#f1a94b"/>
  <circle cx="24" cy="45" r="5" fill="#f5f2e9"/>
  <circle cx="44" cy="45" r="5" fill="#f5f2e9"/>
  <path d="M20 28h17v8H20z" fill="#f5f2e9"/>
  <path d="M39 28h6v8h-6z" fill="#f5f2e9"/>
</svg>
`.trim();

export function GET() {
  return new Response(faviconSvg, {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Type": "image/svg+xml; charset=utf-8"
    }
  });
}
