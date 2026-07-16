import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { handleStripeEvent, verifyStripeSignature } from "@/lib/stripe-billing";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const requestHeaders = await headers();
  try {
    verifyStripeSignature(rawBody, requestHeaders.get("stripe-signature"));
    await handleStripeEvent(JSON.parse(rawBody));
    return NextResponse.json({ received: true });
  } catch (error) {
    console.warn("Stripe Webhook abgelehnt.", error);
    return NextResponse.json({ error: "Webhook konnte nicht verarbeitet werden." }, { status: 400 });
  }
}
