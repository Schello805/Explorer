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
    styleUrl: "https://tiles.openfreemap.org/styles/liberty",
    configured: true
  },
  contact: {
    phone: "+49 9871 123456",
    email: "hallo@camping-sonnental.de",
    emergency: "112 · Rezeption +49 9871 123456"
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

Zwecke der Verarbeitung:
Wir verarbeiten personenbezogene Daten zur Bereitstellung der Platzguide-PWA, zur Mandantenverwaltung, zum Login, zur technischen Sicherheit, zur E-Mail-Kommunikation, für Feedback-, Auskunfts- und Löschanfragen sowie für aktivierte Module wie Gästemappe, Veranstaltungen, Rundgänge oder Check-ins.

Rechtsgrundlagen:
Die Verarbeitung erfolgt je nach Funktion auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO, Art. 6 Abs. 1 lit. f DSGVO, Art. 6 Abs. 1 lit. c DSGVO oder nach Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO.

Mandantentrennung:
Daten eines Campingplatzes werden mit einer tenantId gespeichert und serverseitig nur dem zugehörigen Mandanten bereitgestellt. Betreiber sehen und bearbeiten ausschließlich die ihrem Mandanten zugeordneten Inhalte.

Technische Daten:
Beim Aufruf können IP-Adresse, Datum, Uhrzeit, Browserdaten, angeforderte Seiten und technische Protokolldaten verarbeitet werden, um die App sicher und stabil bereitzustellen.

Optionale Dienste:
Tracking, Push-Mitteilungen, externe Medien oder vergleichbare optionale Dienste werden nur aktiviert, wenn sie in der jeweiligen Mandantenkonfiguration eingerichtet sind und eine erforderliche Einwilligung vorliegt.

Speicherdauer:
Daten werden nur so lange gespeichert, wie sie für den jeweiligen Zweck erforderlich sind oder gesetzliche Pflichten bestehen. Lösch- und Auskunftsanfragen können über die Kontaktadresse gestellt werden.

Betroffenenrechte:
Sie haben nach Maßgabe der DSGVO Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch. Erteilte Einwilligungen können mit Wirkung für die Zukunft widerrufen werden. Außerdem besteht ein Beschwerderecht bei einer Datenschutzaufsichtsbehörde.`,
    cookies: `Cookie- und Speicherhinweise

Platzguide nutzt notwendige Cookies und lokale Speicherfunktionen, damit Login, Sicherheit, Sprache, Favoriten, Check-ins, Offline-Funktion und Einwilligungsstatus funktionieren.

Notwendige Speicherung:
- Session-Cookie für den Admin-Login
- Consent-Status für Datenschutz- und Cookie-Entscheidungen
- lokale Favoriten und Offline-Daten der PWA

Optionale Speicherung:
Statistik, Tracking, Push-Mitteilungen oder externe Dienste werden nur nach Aktivierung in der Mandantenkonfiguration und, soweit erforderlich, nach Einwilligung verwendet.

Sie können Browser-Speicher jederzeit über die Einstellungen Ihres Browsers löschen.`
  },
  tracking: { enabled: false, provider: "none", measurementId: "" },
  email: { senderName: "Camping Sonnental", senderEmail: "noreply@camping-sonnental.de", replyTo: "hallo@camping-sonnental.de" },
  integrations: {
    mail: { provider: "smtp", fromEmail: "info@schellenberger.biz", fromName: "Platzguide", smtpHost: "", smtpPort: 587, smtpSecure: false, smtpUser: "" },
    captcha: { provider: "disabled", siteKey: "", requiredForSignup: true },
    storage: { provider: "local", maxUploadMb: 10, allowedTypes: ["image/png", "image/jpeg", "image/webp", "application/pdf"] },
    database: { provider: "postgresql", rlsRequired: true },
    backup: { enabled: false, schedule: "daily", retentionDays: 14 }
  },
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
  auditLog: [],
  users: [
    {
      id: "81111111-1111-4111-8111-111111111111",
      tenantId: "11111111-1111-4111-8111-111111111111",
      email: "admin@schellenberger.biz",
      role: "tenant-owner",
      createdAt: "2026-07-09T08:00:00.000Z"
    }
  ],
  privacyRequests: []
};

export const tenants = [demoTenant];
