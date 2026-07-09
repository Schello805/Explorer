export type StationStatus = "open" | "closed" | "limited" | "maintenance";

export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

export type MediaAsset = {
  id: string;
  tenantId: string;
  title: string;
  url: string;
  type: "image" | "document" | "video";
  alt: string;
  createdAt: string;
};

export type EventItem = {
  id: string;
  tenantId: string;
  title: string;
  startsAt: string;
  location: string;
  description: string;
  active: boolean;
};

export type TourStop = {
  stationId: string;
  note: string;
};

export type Tour = {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  durationMinutes: number;
  active: boolean;
  stops: TourStop[];
};

export type Reward = {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  requiredCheckins: number;
  active: boolean;
};

export type GuestGuideItem = {
  id: string;
  tenantId: string;
  title: string;
  body: string;
  sortOrder: number;
};

export type FeedbackMessage = {
  id: string;
  tenantId: string;
  stationId?: string;
  message: string;
  contact?: string;
  status: "new" | "reviewed" | "resolved";
  createdAt: string;
};

export type AuditEntry = {
  id: string;
  tenantId: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
};

export type UserRole = "platform-admin" | "tenant-owner" | "tenant-editor" | "tenant-viewer";

export type TenantUser = {
  id: string;
  tenantId: string;
  email: string;
  role: Exclude<UserRole, "platform-admin">;
  passwordHash?: string;
  emailVerifiedAt?: string;
  createdAt: string;
};

export type PrivacyRequest = {
  id: string;
  tenantId: string;
  email: string;
  type: "export" | "delete";
  status: "new" | "processing" | "done" | "rejected";
  createdAt: string;
};

export type Station = {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  shortDescription: string;
  description: string;
  openingHours: string;
  status: StationStatus;
  latitude: number;
  longitude: number;
  position: { x: number; y: number };
  image: string;
  featured?: boolean;
};

export type Tenant = {
  id: string;
  slug: string;
  hosts: string[];
  name: string;
  tagline: string;
  logoMark: string;
  theme: { primary: string; secondary: string; surface: string };
  map: {
    center: [number, number];
    zoom: number;
    styleUrl: string;
    aerialTiles?: string[];
    aerialAttribution?: string;
    sitePlan?: {
      imageUrl: string;
      coordinates: [[number, number], [number, number], [number, number], [number, number]];
      attribution: string;
    };
  };
  contact: { phone: string; email: string; emergency: string };
  legal: { imprint: string; privacy: string; cookies: string };
  tracking: { enabled: boolean; provider: string; measurementId: string };
  email: { senderName: string; senderEmail: string; replyTo: string };
  features: Record<string, boolean>;
  categories: Category[];
  stations: Station[];
  media: MediaAsset[];
  events: EventItem[];
  tours: Tour[];
  rewards: Reward[];
  guestGuide: GuestGuideItem[];
  feedback: FeedbackMessage[];
  auditLog: AuditEntry[];
  users: TenantUser[];
  privacyRequests: PrivacyRequest[];
};
