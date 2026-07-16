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
  sizeBytes?: number;
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

export type PushMessage = {
  id: string;
  tenantId: string;
  title: string;
  body: string;
  audience: "all" | "guests";
  active: boolean;
  createdAt: string;
  sentAt?: string;
  sentCount?: number;
};

export type PushSubscriptionRecord = {
  id: string;
  tenantId: string;
  endpoint: string;
  subscription: {
    endpoint: string;
    expirationTime?: number | null;
    keys: { p256dh: string; auth: string };
  };
  userAgent?: string;
  createdAt: string;
  lastSeenAt: string;
};

export type CheckinRecord = {
  id: string;
  tenantId: string;
  stationId: string;
  deviceId: string;
  createdAt: string;
};

export type OccupancyStatus = {
  id: string;
  tenantId: string;
  label: string;
  status: "free" | "busy" | "full" | "closed";
  note: string;
  active: boolean;
  updatedAt: string;
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
  attachments?: FeedbackAttachment[];
  status: "new" | "reviewed" | "resolved";
  createdAt: string;
};

export type FeedbackAttachment = {
  id: string;
  name: string;
  url: string;
  type: "image" | "document";
  sizeBytes: number;
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
  emailVerificationToken?: string;
  emailVerificationExpiresAt?: string;
  passwordResetToken?: string;
  passwordResetExpiresAt?: string;
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

export type TenantPublicSnapshot = {
  id: string;
  version: number;
  createdAt: string;
  createdBy: string;
  tenant: Tenant;
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
  isTemplate?: boolean;
};

export type Tenant = {
  id: string;
  slug: string;
  hosts: string[];
  archivedAt?: string;
  publishing?: {
    hasUnpublishedChanges: boolean;
    publishedAt?: string;
    publishedVersion?: number;
    versions: TenantPublicSnapshot[];
  };
  name: string;
  tagline: string;
  logoMark: string;
  theme: { primary: string; secondary: string; surface: string };
  map: {
    center: [number, number];
    zoom: number;
    styleUrl: string;
    configured?: boolean;
    bounds?: [[number, number], [number, number]];
    sitePlan?: {
      imageUrl: string;
      coordinates: [[number, number], [number, number], [number, number], [number, number]];
      attribution: string;
    };
  };
  contact: { phone: string; email: string; emergency: string };
  legal: { imprint: string; privacy: string; cookies: string; terms: string };
  tracking: {
    enabled: boolean;
    provider: "none" | "matomo";
    measurementId: string;
    matomoUrl: string;
    matomoSiteId: string;
    anonymizeIp: boolean;
    respectDoNotTrack: boolean;
  };
  email: { senderName: string; senderEmail: string; replyTo: string };
  billing: {
    plan: "starter" | "pro";
    status: "trial" | "active" | "past_due" | "blocked";
    publicEnabled: boolean;
    monthlyPriceCents: number;
    yearlyDiscountPercent: number;
    storageLimitMb: number;
    supportResponseHours: number;
    setupServiceBooked?: boolean;
    setupServicePriceCents: number;
    customDomainEnabled: boolean;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    stripeCurrentPeriodEnd?: string;
    stripeLatestInvoiceUrl?: string;
    stripeCheckoutSessionId?: string;
    stripePortalUrl?: string;
    manualOverride?: boolean;
    manualOverrideReason?: string;
  };
  integrations: {
    mail: { provider: "global-smtp" };
    captcha: { provider: "turnstile" | "hcaptcha" | "recaptcha" | "disabled"; siteKey: string; requiredForSignup: boolean };
    storage: { provider: "local" | "s3" | "external-url"; maxUploadMb: number; allowedTypes: string[] };
    database: { provider: "postgresql"; rlsRequired: boolean };
    backup: { enabled: boolean; schedule: string; retentionDays: number };
  };
  features: Record<string, boolean>;
  categories: Category[];
  stations: Station[];
  media: MediaAsset[];
  events: EventItem[];
  tours: Tour[];
  rewards: Reward[];
  pushMessages: PushMessage[];
  pushSubscriptions: PushSubscriptionRecord[];
  checkins: CheckinRecord[];
  occupancyStatuses: OccupancyStatus[];
  guestGuide: GuestGuideItem[];
  feedback: FeedbackMessage[];
  auditLog: AuditEntry[];
  users: TenantUser[];
  privacyRequests: PrivacyRequest[];
};
