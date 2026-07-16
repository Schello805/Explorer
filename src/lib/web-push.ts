import "server-only";

import webpush from "web-push";
import type { PushSubscriptionRecord } from "@/lib/types";

export function publicVapidKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
}

export function webPushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.MAIL_FROM);
}

export async function sendWebPush(subscription: PushSubscriptionRecord, payload: { title: string; body: string; url: string }) {
  if (!webPushConfigured()) return { ok: false, skipped: true };
  webpush.setVapidDetails(
    `mailto:${process.env.MAIL_FROM}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  await webpush.sendNotification(subscription.subscription, JSON.stringify(payload));
  return { ok: true, skipped: false };
}
