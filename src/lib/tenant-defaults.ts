import type { Category, Station, Tenant } from "@/lib/types";

export const defaultCategories: Category[] = [
  { id: "service", name: "Service", icon: "Sparkles", color: "#256f5b" },
  { id: "sanitary", name: "Sanitär", icon: "Droplets", color: "#297aa3" },
  { id: "disposal", name: "Entsorgung", icon: "Recycle", color: "#54733f" },
  { id: "food", name: "Essen & Trinken", icon: "Utensils", color: "#c9653d" },
  { id: "family", name: "Familie", icon: "Caravan", color: "#d49b2e" },
  { id: "nature", name: "Entdecken", icon: "Footprints", color: "#54733f" }
];

export const tenantDefaults: Omit<Tenant, "id" | "slug" | "hosts" | "name" | "users" | "auditLog"> = {
  tagline: "Mein digitaler Platzguide.",
  logoMark: "P",
  theme: { primary: "#195f4c", secondary: "#f1a94b", surface: "#f5f2e9" },
  map: {
    center: [10.0, 51.0],
    zoom: 6,
    styleUrl: "https://tiles.openfreemap.org/styles/liberty",
    configured: false
  },
  contact: {
    phone: "",
    email: "info@schellenberger.biz",
    emergency: "112"
  },
  legal: {
    imprint: `Angaben gemäß § 5 DDG

Michael Schellenberger
Ziegeleistrasse 32
91572 Bechhofen
Deutschland

E-Mail: info@schellenberger.biz

Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:
Michael Schellenberger
Ziegeleistrasse 32
91572 Bechhofen`,
    privacy: `Datenschutzhinweise

Verantwortlicher:
Michael Schellenberger, Ziegeleistrasse 32, 91572 Bechhofen, E-Mail: info@schellenberger.biz.

Platzguide verarbeitet Daten zur Bereitstellung der PWA, zur Mandantenverwaltung, zum Login, zur technischen Sicherheit, zur E-Mail-Kommunikation sowie für aktivierte Module wie Gästemappe, Veranstaltungen, Rundgänge, Feedback oder Check-ins.

Daten werden mandantengetrennt gespeichert. Jeder Datensatz ist einem Mandanten zugeordnet und wird serverseitig nur für den jeweiligen Mandanten bereitgestellt.

Optionale Dienste wie Tracking, Push-Mitteilungen oder externe Medien werden nur nach Aktivierung in der jeweiligen Konfiguration und, soweit erforderlich, nach Einwilligung verwendet.

Betroffene Personen haben Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch. Erteilte Einwilligungen können mit Wirkung für die Zukunft widerrufen werden.`,
    cookies: `Cookie- und Speicherhinweise

Platzguide nutzt notwendige Cookies und lokale Speicherfunktionen für Login, Sicherheit, Sprache, Favoriten, Offline-Funktion und Einwilligungsstatus.

Optionale Speicherung für Statistik, Tracking, Push-Mitteilungen oder externe Dienste erfolgt nur nach Aktivierung und, soweit erforderlich, nach Einwilligung.`
  },
  tracking: { enabled: false, provider: "none", measurementId: "" },
  email: { senderName: "Platzguide", senderEmail: "info@schellenberger.biz", replyTo: "info@schellenberger.biz" },
  billing: {
    plan: "starter",
    status: "trial",
    publicEnabled: false,
    monthlyPriceCents: 499,
    yearlyDiscountPercent: 15,
    storageLimitMb: 100,
    supportResponseHours: 24,
    setupServiceBooked: false,
    setupServicePriceCents: 19900,
    customDomainEnabled: false
  },
  integrations: {
    mail: { provider: "smtp", fromEmail: "info@schellenberger.biz", fromName: "Platzguide", smtpHost: "", smtpPort: 587, smtpSecure: false, smtpUser: "" },
    captcha: { provider: "disabled", siteKey: "", requiredForSignup: true },
    storage: { provider: "local", maxUploadMb: 100, allowedTypes: ["image/png", "image/jpeg", "image/webp", "application/pdf", "video/mp4", "video/webm"] },
    database: { provider: "postgresql", rlsRequired: true },
    backup: { enabled: false, schedule: "daily", retentionDays: 14 }
  },
  features: {
    tours: false,
    checkins: false,
    events: false,
    feedback: false,
    rewards: false,
    push: false,
    occupancy: false,
    guestGuide: false
  },
  categories: defaultCategories,
  stations: [],
  media: [],
  events: [],
  tours: [],
  rewards: [],
  guestGuide: [],
  feedback: [],
  privacyRequests: []
};

export function createDefaultStationTemplates(tenantId: string): Station[] {
  return [
    stationTemplate(tenantId, {
      categoryId: "service",
      name: "Rezeption",
      shortDescription: "Ankunft, Fragen und Gästeservice.",
      description: "Adresse, Öffnungszeiten und Hinweise der Rezeption ergänzen.",
      position: { x: 50, y: 50 },
      image: "linear-gradient(135deg, #f4c77a, #779a71)"
    }),
    stationTemplate(tenantId, {
      categoryId: "sanitary",
      name: "Sanitärgebäude 1",
      shortDescription: "Duschen, WCs und Waschbereich.",
      description: "Ausstattung, Barrierefreiheit und Öffnungszeiten ergänzen.",
      position: { x: 38, y: 42 },
      image: "linear-gradient(135deg, #b7dbe5, #4e8393)"
    }),
    stationTemplate(tenantId, {
      categoryId: "sanitary",
      name: "Sanitärgebäude 2",
      shortDescription: "Weiteres Sanitärgebäude auf dem Platz.",
      description: "Bei Bedarf löschen oder an die tatsächliche Lage anpassen.",
      position: { x: 64, y: 44 },
      image: "linear-gradient(135deg, #c9e6e8, #5d95a2)"
    }),
    stationTemplate(tenantId, {
      categoryId: "disposal",
      name: "Entsorgungsstation Abfall",
      shortDescription: "Mülltrennung und Sammelstelle.",
      description: "Container, Glas, Papier, Restmüll und Öffnungszeiten ergänzen.",
      position: { x: 24, y: 70 },
      image: "linear-gradient(135deg, #d8dfc7, #6b8358)"
    }),
    stationTemplate(tenantId, {
      categoryId: "disposal",
      name: "Entsorgung Toilette",
      shortDescription: "Chemietoiletten- und Grauwasserentsorgung.",
      description: "Hinweise zur Nutzung und Zufahrt ergänzen.",
      position: { x: 30, y: 64 },
      image: "linear-gradient(135deg, #d7e0d2, #557568)"
    }),
    stationTemplate(tenantId, {
      categoryId: "family",
      name: "Spielplatz",
      shortDescription: "Spielbereich für Kinder.",
      description: "Altersbereiche, Ausstattung und Sicherheitsregeln ergänzen.",
      position: { x: 68, y: 32 },
      image: "linear-gradient(135deg, #eccb6b, #6c9a5b)"
    }),
    stationTemplate(tenantId, {
      categoryId: "food",
      name: "Restaurant",
      shortDescription: "Essen, Getränke oder Kiosk.",
      description: "Angebot, Reservierung, Öffnungszeiten und Ruhetage ergänzen.",
      position: { x: 58, y: 66 },
      image: "linear-gradient(135deg, #efad66, #9d5747)"
    })
  ];
}

function stationTemplate(tenantId: string, input: Pick<Station, "categoryId" | "name" | "shortDescription" | "description" | "position" | "image">): Station {
  return {
    id: crypto.randomUUID(),
    tenantId,
    openingHours: "Bitte eintragen",
    status: "closed",
    latitude: 0,
    longitude: 0,
    isTemplate: true,
    ...input
  };
}
