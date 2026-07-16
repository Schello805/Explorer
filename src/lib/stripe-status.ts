import type { Tenant } from "@/lib/types";

export function mapStripeSubscriptionStatus(status?: string): Tenant["billing"]["status"] {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  return "blocked";
}
