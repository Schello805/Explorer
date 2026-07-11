import { readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import { ADMIN_EMAIL } from "@/lib/auth";
import { sendMail } from "@/lib/mail";
import { listTenants } from "@/lib/tenant-store";

const throttleFile = path.join(os.tmpdir(), "platzguide-monitoring-alert.json");

export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret") ?? request.headers.get("x-monitoring-secret");
  if (process.env.MONITORING_SECRET && secret !== process.env.MONITORING_SECRET) {
    return NextResponse.json({ ok: false, error: "Nicht autorisiert" }, { status: 401 });
  }
  if (!process.env.MONITORING_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "MONITORING_SECRET fehlt." }, { status: 503 });
  }

  const startedAt = Date.now();
  try {
    const tenants = await listTenants();
    await writeAlertState({ healthy: true, lastOkAt: new Date().toISOString() });
    return NextResponse.json({
      ok: true,
      app: "platzguide",
      revision: process.env.NEXT_PUBLIC_APP_REVISION ?? "dev",
      tenants: tenants.length,
      latencyMs: Date.now() - startedAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Monitoring-Fehler";
    await sendAlertIfNeeded(message);
    return NextResponse.json({
      ok: false,
      app: "platzguide",
      revision: process.env.NEXT_PUBLIC_APP_REVISION ?? "dev",
      error: message,
      latencyMs: Date.now() - startedAt
    }, { status: 503 });
  }
}

async function sendAlertIfNeeded(message: string) {
  const previous = await readAlertState();
  const now = Date.now();
  const lastAlertAt = previous.lastAlertAt ? new Date(previous.lastAlertAt).getTime() : 0;
  const shouldSend = now - lastAlertAt > 30 * 60 * 1000;
  if (!shouldSend) return;
  await writeAlertState({ healthy: false, lastAlertAt: new Date().toISOString(), lastError: message });
  await sendMail({
    to: ADMIN_EMAIL,
    subject: "Platzguide Monitoring-Alarm",
    text: `Der Uptime-Check ist fehlgeschlagen.\n\nFehler: ${message}\nZeitpunkt: ${new Date().toISOString()}\nRevision: ${process.env.NEXT_PUBLIC_APP_REVISION ?? "dev"}`
  });
}

async function readAlertState() {
  try {
    return JSON.parse(await readFile(throttleFile, "utf8")) as { healthy?: boolean; lastOkAt?: string; lastAlertAt?: string; lastError?: string };
  } catch {
    return {};
  }
}

async function writeAlertState(state: { healthy: boolean; lastOkAt?: string; lastAlertAt?: string; lastError?: string }) {
  await writeFile(throttleFile, JSON.stringify(state), "utf8").catch(() => undefined);
}
