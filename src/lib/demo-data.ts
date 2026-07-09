import type { Tenant } from "@/lib/types";

const categories = [
  { id: "service", name: "Service", icon: "Sparkles", color: "#256f5b" },
  { id: "sanitary", name: "Sanitär", icon: "Droplets", color: "#297aa3" },
  { id: "food", name: "Essen & Trinken", icon: "Utensils", color: "#c9653d" },
  { id: "family", name: "Familie", icon: "Caravan", color: "#d49b2e" },
  { id: "nature", name: "Entdecken", icon: "Footprints", color: "#54733f" }
];

export const demoTenant: Tenant = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "sonnental",
  hosts: ["sonnental.localhost", "localhost", "127.0.0.1"],
  name: "Camping Sonnental",
  tagline: "Dein Platz. Deine kleinen Abenteuer.",
  logoMark: "S",
  theme: { primary: "#195f4c", secondary: "#f1a94b", surface: "#f5f2e9" },
  map: {
    center: [10.5605, 49.1643],
    zoom: 16,
    styleUrl: "https://tiles.openfreemap.org/styles/liberty"
  },
  contact: {
    phone: "+49 9871 123456",
    email: "hallo@camping-sonnental.de",
    emergency: "112 · Rezeption +49 9871 123456"
  },
  legal: {
    imprint: "Camping Sonnental e. V. · Musterweg 12 · 91572 Sonnental",
    privacy: "Wir verarbeiten nur Daten, die für den Betrieb dieser Anwendung erforderlich sind. Optionale Dienste werden erst nach Ihrer Einwilligung aktiviert.",
    cookies: "Notwendige lokale Speicherungen sichern Favoriten und Ihre Einwilligungsentscheidung. Statistik-Cookies werden nur nach Zustimmung gesetzt."
  },
  tracking: { enabled: false, provider: "none", measurementId: "" },
  email: { senderName: "Camping Sonnental", senderEmail: "noreply@camping-sonnental.de", replyTo: "hallo@camping-sonnental.de" },
  features: {
    tours: true,
    checkins: true,
    events: true,
    feedback: true,
    rewards: true,
    push: false,
    occupancy: true,
    guestGuide: true
  },
  categories,
  stations: [
    {
      id: "21111111-1111-4111-8111-111111111111",
      tenantId: "11111111-1111-4111-8111-111111111111",
      categoryId: "service",
      name: "Rezeption & Gästeservice",
      shortDescription: "Ankommen, fragen, wohlfühlen.",
      description: "Unser Team hilft bei allen Fragen rund um Ihren Aufenthalt, Ausflugszielen und Reservierungen.",
      openingHours: "Heute 08:00–20:00",
      status: "open",
      latitude: 49.165,
      longitude: 10.562,
      position: { x: 48, y: 52 },
      image: "linear-gradient(135deg, #f4c77a, #779a71)",
      featured: true
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      tenantId: "11111111-1111-4111-8111-111111111111",
      categoryId: "sanitary",
      name: "Waschhaus Nord",
      shortDescription: "Duschen, Familienbad und barrierefreies WC.",
      description: "Modernes Waschhaus mit Einzelkabinen, Wickelraum und barrierefreiem Zugang.",
      openingHours: "Durchgehend geöffnet",
      status: "open",
      latitude: 49.166,
      longitude: 10.56,
      position: { x: 31, y: 32 },
      image: "linear-gradient(135deg, #b7dbe5, #4e8393)"
    },
    {
      id: "23333333-3333-4333-8333-333333333333",
      tenantId: "11111111-1111-4111-8111-111111111111",
      categoryId: "family",
      name: "Waldspielplatz",
      shortDescription: "Klettern, matschen und neue Freunde finden.",
      description: "Naturnaher Spielplatz mit Kletterturm, Wasserlauf und Sitzplätzen für Eltern.",
      openingHours: "Täglich 08:00–20:00",
      status: "open",
      latitude: 49.164,
      longitude: 10.559,
      position: { x: 67, y: 28 },
      image: "linear-gradient(135deg, #eccb6b, #6c9a5b)",
      featured: true
    },
    {
      id: "24444444-4444-4444-8444-444444444444",
      tenantId: "11111111-1111-4111-8111-111111111111",
      categoryId: "food",
      name: "Sonnenküche",
      shortDescription: "Regional, unkompliziert und richtig lecker.",
      description: "Kleine regionale Karte, Frühstücksbrötchen und Eis auf unserer Sonnenterrasse.",
      openingHours: "Heute 12:00–21:00",
      status: "limited",
      latitude: 49.163,
      longitude: 10.563,
      position: { x: 59, y: 68 },
      image: "linear-gradient(135deg, #efad66, #9d5747)"
    },
    {
      id: "25555555-5555-4555-8555-555555555555",
      tenantId: "11111111-1111-4111-8111-111111111111",
      categoryId: "nature",
      name: "Uferpfad",
      shortDescription: "Ruhiger Rundweg am kleinen See.",
      description: "Ein 1,8 km langer, familienfreundlicher Spazierweg mit drei Aussichtspunkten.",
      openingHours: "Jederzeit zugänglich",
      status: "open",
      latitude: 49.162,
      longitude: 10.558,
      position: { x: 20, y: 73 },
      image: "linear-gradient(135deg, #a8c797, #3c7563)"
    }
  ],
  media: [
    {
      id: "31111111-1111-4111-8111-111111111111",
      tenantId: "11111111-1111-4111-8111-111111111111",
      title: "Sonnental Platzübersicht",
      url: "/icons/icon-512.png",
      type: "image",
      alt: "Symbolische Platzübersicht",
      createdAt: "2026-07-09T08:00:00.000Z"
    }
  ],
  events: [
    {
      id: "41111111-1111-4111-8111-111111111111",
      tenantId: "11111111-1111-4111-8111-111111111111",
      title: "Lagerfeuerabend",
      startsAt: "2026-07-10T19:30:00.000Z",
      location: "Feuerstelle am Uferpfad",
      description: "Gemeinsamer Abend mit Stockbrot und kurzen Geschichten für Familien.",
      active: true
    }
  ],
  tours: [
    {
      id: "51111111-1111-4111-8111-111111111111",
      tenantId: "11111111-1111-4111-8111-111111111111",
      title: "Kleine Sonnental-Runde",
      description: "Kurzer Rundgang vom Gästeservice über Spielplatz und Uferpfad.",
      durationMinutes: 35,
      active: true,
      stops: [
        { stationId: "21111111-1111-4111-8111-111111111111", note: "Start mit aktuellen Tageshinweisen." },
        { stationId: "23333333-3333-4333-8333-333333333333", note: "Familienpause am Waldspielplatz." },
        { stationId: "25555555-5555-4555-8555-555555555555", note: "Ruhiger Abschluss am Ufer." }
      ]
    }
  ],
  rewards: [
    {
      id: "61111111-1111-4111-8111-111111111111",
      tenantId: "11111111-1111-4111-8111-111111111111",
      title: "Sonnental-Platzguide",
      description: "Nach drei Check-ins gibt es an der Rezeption eine kleine Überraschung.",
      requiredCheckins: 3,
      active: true
    }
  ],
  guestGuide: [
    {
      id: "71111111-1111-4111-8111-111111111111",
      tenantId: "11111111-1111-4111-8111-111111111111",
      title: "Platzruhe",
      body: "Bitte halten Sie von 22:00 bis 07:00 Uhr die Nachtruhe ein.",
      sortOrder: 1
    },
    {
      id: "72222222-2222-4222-8222-222222222222",
      tenantId: "11111111-1111-4111-8111-111111111111",
      title: "Mülltrennung",
      body: "Die Sammelstelle befindet sich am nördlichen Serviceweg.",
      sortOrder: 2
    }
  ],
  feedback: [],
  auditLog: []
};

export const tenants = [demoTenant];
