import type { Tenant } from "@/lib/types";

export const billingPlans = {
  starter: {
    label: "Starter",
    monthlyPriceCents: 499,
    storageLimitMb: 100,
    supportResponseHours: 24,
    customDomainEnabled: false
  },
  pro: {
    label: "Pro",
    monthlyPriceCents: 1999,
    storageLimitMb: 1024,
    supportResponseHours: 6,
    customDomainEnabled: true
  }
} as const;

export const yearlyDiscountPercent = 15;
export const setupServicePriceCents = 19900;

export function applyBillingPlan(tenant: Tenant, plan: Tenant["billing"]["plan"]): Tenant {
  const definition = billingPlans[plan];
  return {
    ...tenant,
    billing: {
      ...tenant.billing,
      plan,
      monthlyPriceCents: definition.monthlyPriceCents,
      storageLimitMb: definition.storageLimitMb,
      supportResponseHours: definition.supportResponseHours,
      yearlyDiscountPercent,
      setupServicePriceCents,
      customDomainEnabled: definition.customDomainEnabled
    },
    integrations: {
      ...tenant.integrations,
      storage: {
        ...tenant.integrations.storage,
        maxUploadMb: Math.min(100, definition.storageLimitMb)
      }
    }
  };
}

export function formatEuro(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function storageUsedMb(tenant: Tenant) {
  const bytes = tenant.media.reduce((sum, asset) => sum + (asset.sizeBytes ?? 0), 0);
  return Math.round(bytes / 1024 / 1024 * 10) / 10;
}
