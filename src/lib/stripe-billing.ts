import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { appUrl } from "@/lib/mail";
import { applyBillingPlan } from "@/lib/billing";
import { mapStripeSubscriptionStatus } from "@/lib/stripe-status";
import { listTenants, saveTenantConfiguration } from "@/lib/tenant-store";
import type { Tenant } from "@/lib/types";

type BillingInterval = "monthly" | "yearly";
type CheckoutPlan = "starter" | "pro";

const stripeApi = "https://api.stripe.com/v1";

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_ENABLED === "true" && process.env.STRIPE_SECRET_KEY);
}

export function priceIdFor(plan: CheckoutPlan, interval: BillingInterval) {
  const key = `STRIPE_${plan.toUpperCase()}_${interval === "monthly" ? "MONTHLY" : "YEARLY"}_PRICE_ID`;
  return process.env[key] ?? "";
}

export async function createSubscriptionCheckout(tenant: Tenant, plan: CheckoutPlan, interval: BillingInterval) {
  const price = priceIdFor(plan, interval);
  if (!stripeConfigured()) throw new Error("Stripe ist nicht vollständig konfiguriert.");
  if (!price) throw new Error(`Stripe Price-ID fehlt für ${plan} ${interval}.`);
  const ownerEmail = tenant.users.find((user) => user.role === "tenant-owner")?.email ?? tenant.contact.email;
  const params = new URLSearchParams({
    mode: "subscription",
    client_reference_id: tenant.id,
    customer_email: tenant.billing.stripeCustomerId ? "" : ownerEmail,
    success_url: appUrl(`/admin/tenant?tenant=${tenant.slug}&billing=success`),
    cancel_url: appUrl(`/admin/tenant?tenant=${tenant.slug}&billing=cancelled`),
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    "metadata[tenantId]": tenant.id,
    "metadata[plan]": plan,
    "metadata[interval]": interval,
    "subscription_data[metadata][tenantId]": tenant.id,
    "subscription_data[metadata][plan]": plan,
    "subscription_data[metadata][interval]": interval
  });
  if (tenant.billing.stripeCustomerId) {
    params.set("customer", tenant.billing.stripeCustomerId);
    params.delete("customer_email");
  }
  return stripeRequest<{ id: string; url: string }>("/checkout/sessions", params);
}

export async function createCustomerPortalSession(tenant: Tenant) {
  if (!stripeConfigured()) throw new Error("Stripe ist nicht vollständig konfiguriert.");
  if (!tenant.billing.stripeCustomerId) throw new Error("Für diesen Campingplatz ist noch kein Stripe-Kunde verknüpft.");
  const params = new URLSearchParams({
    customer: tenant.billing.stripeCustomerId,
    return_url: appUrl(`/admin/tenant?tenant=${tenant.slug}`)
  });
  return stripeRequest<{ url: string }>("/billing_portal/sessions", params);
}

export function verifyStripeSignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET fehlt.");
  if (!signatureHeader) throw new Error("Stripe-Signatur fehlt.");
  const parts = Object.fromEntries(signatureHeader.split(",").map((part) => {
    const [key, value] = part.split("=");
    return [key, value];
  }));
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) throw new Error("Stripe-Signatur ist ungültig.");
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
    throw new Error("Stripe-Signaturprüfung fehlgeschlagen.");
  }
}

export async function handleStripeEvent(event: StripeEvent) {
  if (!event.id || !event.type) throw new Error("Stripe-Event ist unvollständig.");
  if (event.type === "checkout.session.completed") {
    await handleCheckoutCompleted(event.data.object as StripeCheckoutSession, event.id);
  }
  if (event.type.startsWith("customer.subscription.")) {
    await handleSubscriptionUpdated(event.data.object as StripeSubscription, event.id);
  }
  if (event.type === "invoice.payment_failed" || event.type === "invoice.payment_succeeded") {
    await handleInvoiceEvent(event.data.object as StripeInvoice, event.id, event.type);
  }
}

async function handleCheckoutCompleted(session: StripeCheckoutSession, eventId: string) {
  const tenant = await findTenant(session.metadata?.tenantId, session.customer);
  if (!tenant) return;
  const plan = normalizePlan(session.metadata?.plan);
  const next = applyBillingPlan({
    ...tenant,
    billing: {
      ...tenant.billing,
      status: "active",
      publicEnabled: tenant.billing.publicEnabled,
      stripeCustomerId: stringValue(session.customer) ?? tenant.billing.stripeCustomerId,
      stripeSubscriptionId: stringValue(session.subscription) ?? tenant.billing.stripeSubscriptionId,
      stripeCheckoutSessionId: session.id
    },
    auditLog: [stripeAudit(tenant, "stripe-checkout-completed", eventId), ...tenant.auditLog].slice(0, 100)
  }, plan);
  await saveTenantConfiguration(tenant.id, next, "stripe-webhook");
}

async function handleSubscriptionUpdated(subscription: StripeSubscription, eventId: string) {
  const tenant = await findTenant(subscription.metadata?.tenantId, subscription.customer);
  if (!tenant) return;
  const plan = normalizePlan(subscription.metadata?.plan ?? planFromPrice(subscription.items?.data?.[0]?.price?.id));
  const stripeStatus = mapStripeSubscriptionStatus(subscription.status);
  const next = applyBillingPlan({
    ...tenant,
    billing: {
      ...tenant.billing,
      status: stripeStatus,
      publicEnabled: stripeStatus === "active" ? tenant.billing.publicEnabled : false,
      stripeCustomerId: stringValue(subscription.customer) ?? tenant.billing.stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items?.data?.[0]?.price?.id,
      stripeCurrentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : tenant.billing.stripeCurrentPeriodEnd
    },
    auditLog: [stripeAudit(tenant, `stripe-subscription-${subscription.status}`, eventId), ...tenant.auditLog].slice(0, 100)
  }, plan);
  await saveTenantConfiguration(tenant.id, next, "stripe-webhook");
}

async function handleInvoiceEvent(invoice: StripeInvoice, eventId: string, type: string) {
  const tenant = await findTenant(invoice.metadata?.tenantId, invoice.customer);
  if (!tenant) return;
  const status = type === "invoice.payment_failed" ? "past_due" : tenant.billing.status === "blocked" ? "blocked" : "active";
  await saveTenantConfiguration(tenant.id, {
    ...tenant,
    billing: {
      ...tenant.billing,
      status,
      publicEnabled: status === "active" ? tenant.billing.publicEnabled : false,
      stripeLatestInvoiceUrl: invoice.hosted_invoice_url ?? tenant.billing.stripeLatestInvoiceUrl
    },
    auditLog: [stripeAudit(tenant, type, eventId), ...tenant.auditLog].slice(0, 100)
  }, "stripe-webhook");
}

async function findTenant(tenantId?: string, customerId?: unknown) {
  const tenants = await listTenants();
  return tenants.find((tenant) => tenant.id === tenantId)
    ?? tenants.find((tenant) => tenant.billing.stripeCustomerId && tenant.billing.stripeCustomerId === stringValue(customerId));
}

async function stripeRequest<T>(path: string, body: URLSearchParams) {
  const response = await fetch(`${stripeApi}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
  const payload = await response.json().catch(() => null) as T & { error?: { message?: string } } | null;
  if (!response.ok) throw new Error(payload?.error?.message ?? `Stripe-Fehler ${response.status}`);
  return payload as T;
}

function normalizePlan(value: unknown): CheckoutPlan {
  return value === "pro" ? "pro" : "starter";
}

function planFromPrice(priceId?: string) {
  if (!priceId) return "starter";
  if ([process.env.STRIPE_PRO_MONTHLY_PRICE_ID, process.env.STRIPE_PRO_YEARLY_PRICE_ID].includes(priceId)) return "pro";
  return "starter";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function stripeAudit(tenant: Tenant, action: string, eventId: string) {
  return {
    id: crypto.randomUUID(),
    tenantId: tenant.id,
    actorEmail: "stripe-webhook",
    action,
    entityType: "billing",
    entityId: eventId,
    createdAt: new Date().toISOString()
  };
}

type StripeEvent = {
  id: string;
  type: string;
  data: { object: unknown };
};

type StripeCheckoutSession = {
  id: string;
  customer?: string;
  subscription?: string;
  metadata?: Record<string, string>;
};

type StripeSubscription = {
  id: string;
  customer?: string;
  status?: string;
  current_period_end?: number;
  metadata?: Record<string, string>;
  items?: { data?: { price?: { id?: string } }[] };
};

type StripeInvoice = {
  customer?: string;
  hosted_invoice_url?: string;
  metadata?: Record<string, string>;
};
