import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { resolveTenant } from "@/lib/tenant-resolver";
import { listTenants, saveFeedback } from "@/lib/tenant-store";
import type { FeedbackAttachment } from "@/lib/types";

const feedbackSchema = z.object({
  tenantSlug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/).optional(),
  stationId: z.string().optional(),
  message: z.string().trim().min(5).max(2000),
  contact: z.string().trim().max(160).optional(),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    type: z.enum(["image", "document"]),
    sizeBytes: z.number()
  })).optional()
});

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let body: unknown;
  try {
    body = contentType.includes("multipart/form-data") ? await feedbackFromFormData(request) : await request.json();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ungültige Meldung" }, { status: 400 });
  }
  const parsed = contentType.includes("multipart/form-data")
    ? feedbackSchema.safeParse(body)
    : feedbackSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Meldung" }, { status: 400 });
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip")?.trim() || "local";
  const limited = rateLimit(`feedback:${ip}`, 20, 60 * 60 * 1000);
  if (!limited.ok) return NextResponse.json({ error: "Zu viele Meldungen. Bitte später erneut versuchen." }, { status: 429 });
  const host = requestHeaders.get("host") ?? "localhost";
  const tenants = await listTenants();
  const tenant = parsed.data.tenantSlug
    ? tenants.find((candidate) => candidate.slug === parsed.data.tenantSlug)
    : resolveTenant(host, tenants);
  if (!tenant) return NextResponse.json({ error: "Mandant nicht gefunden" }, { status: 404 });
  if (!tenant.features.feedback) return NextResponse.json({ error: "Feedback ist deaktiviert" }, { status: 403 });
  const { tenantSlug, ...feedback } = parsed.data;
  void tenantSlug;
  await saveFeedback(tenant.id, feedback);
  return NextResponse.json({ ok: true });
}

async function feedbackFromFormData(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const attachments: FeedbackAttachment[] = [];
  if (file instanceof File && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) throw new Error("Feedback-Anhang ist zu groß.");
    const allowed = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) throw new Error("Feedback-Anhang ist nicht erlaubt.");
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!matchesMagicBytes(file.type, buffer)) throw new Error("Feedback-Anhang passt nicht zum Dateityp.");
    const tenantSlug = String(formData.get("tenantSlug") ?? "unknown").replace(/[^a-z0-9-]/g, "-");
    const extension = file.type === "application/pdf" ? ".pdf" : file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg";
    const safeName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    const directory = path.join(process.cwd(), "public", "uploads", "feedback", tenantSlug);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, safeName), buffer, { mode: 0o640 });
    attachments.push({
      id: crypto.randomUUID(),
      name: file.name,
      url: `/uploads/feedback/${tenantSlug}/${safeName}`,
      type: file.type === "application/pdf" ? "document" : "image",
      sizeBytes: file.size
    });
  }
  return {
    tenantSlug: String(formData.get("tenantSlug") ?? ""),
    stationId: String(formData.get("stationId") ?? "") || undefined,
    message: String(formData.get("message") ?? ""),
    contact: String(formData.get("contact") ?? "") || undefined,
    attachments
  };
}

function matchesMagicBytes(type: string, buffer: Buffer) {
  if (type === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (type === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (type === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  return false;
}
