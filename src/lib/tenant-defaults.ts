import type { Category, Tenant } from "@/lib/types";

export const defaultCategories: Category[] = [
  { id: "service", name: "Service", icon: "Sparkles", color: "#256f5b" },
  { id: "sanitary", name: "Sanitär", icon: "Droplets", color: "#297aa3" },
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
  integrations: {
    mail: { provider: "smtp", fromEmail: "info@schellenberger.biz", fromName: "Platzguide", smtpHost: "", smtpPort: 587, smtpSecure: false, smtpUser: "" },
    captcha: { provider: "disabled", siteKey: "", requiredForSignup: true },
    storage: { provider: "local", maxUploadMb: 10, allowedTypes: ["image/png", "image/jpeg", "image/webp", "application/pdf"] },
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
