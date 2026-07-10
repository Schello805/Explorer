import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Platzguide · Campingplatz-App",
    short_name: "Platzguide",
    description: "Dein digitaler Platzguide auf dem Campingplatz.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f2e9",
    theme_color: "#195f4c",
    orientation: "portrait",
    icons: [
      { src: "/icons/platzguide-logo.png", sizes: "600x600", type: "image/png", purpose: "any" },
      { src: "/icons/platzguide-logo.png", sizes: "600x600", type: "image/png", purpose: "maskable" }
    ]
  };
}
