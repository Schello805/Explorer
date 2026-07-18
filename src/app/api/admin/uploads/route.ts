import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { canManageTenant, verifyAdminSession } from "@/lib/auth";
import { resolveAdminTenant } from "@/lib/admin-tenant-auth";
import { rateLimit } from "@/lib/rate-limit";
import { listTenants, saveTenantConfiguration } from "@/lib/tenant-store";

const fallbackTypes = ["image/png", "image/jpeg", "image/webp", "application/pdf", "video/mp4", "video/webm"];
const blockedExtensions = new Set([".svg", ".html", ".htm", ".js", ".mjs", ".exe", ".sh", ".php", ".bat", ".cmd", ".jar", ".zip"]);

async function authorize(requestedTenantId?: string) {
  const cookieStore = await cookies();
  const session = await verifyAdminSession(
    cookieStore.get("platzguide_session")?.value ?? cookieStore.get("explorer_session")?.value
  );
  if (!session) return null;
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost";
  const tenants = await listTenants();
  const tenant = resolveAdminTenant(host, tenants, session);
  const targetTenant = requestedTenantId ? tenants.find((candidate) => candidate.id === requestedTenantId) : tenant;
  return targetTenant && canManageTenant(session, targetTenant.id) ? { session, tenant: targetTenant } : null;
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const coarseUploadLimit = rateLimit(`admin-upload-ip:${ip}`, 120, 60 * 60 * 1000);
  if (!coarseUploadLimit.ok) return NextResponse.json({ error: "Zu viele Uploads. Bitte später erneut versuchen." }, { status: 429 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  const absoluteMaxUploadMb = Number(process.env.UPLOAD_MAX_MB ?? 30);
  if (contentLength > (absoluteMaxUploadMb * 1024 * 1024) + 1024 * 1024) {
    return NextResponse.json({ error: `Upload ist größer als ${absoluteMaxUploadMb} MB` }, { status: 413 });
  }
  const formData = await request.formData();
  const authorization = await authorize(String(formData.get("tenantId") ?? ""));
  if (!authorization) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const uploadLimit = rateLimit(`admin-upload:${authorization.tenant.id}:${authorization.session.email}:${ip}`, 60, 60 * 60 * 1000);
  if (!uploadLimit.ok) return NextResponse.json({ error: "Zu viele Uploads. Bitte später erneut versuchen." }, { status: 429 });

  const file = formData.get("file");
  const purpose = String(formData.get("purpose") ?? "media");
  if (!(file instanceof File)) return NextResponse.json({ error: "Datei fehlt" }, { status: 400 });

  const maxUploadMb = authorization.tenant.integrations.storage.maxUploadMb || Number(process.env.UPLOAD_MAX_MB ?? 30);
  const allowedTypes = authorization.tenant.integrations.storage.allowedTypes.length
    ? authorization.tenant.integrations.storage.allowedTypes
    : fallbackTypes;
  const usedBytes = authorization.tenant.media.reduce((sum, asset) => sum + (asset.sizeBytes ?? 0), 0);
  const limitBytes = authorization.tenant.billing.storageLimitMb * 1024 * 1024;
  const originalExtension = path.extname(file.name).toLowerCase();
  if (blockedExtensions.has(originalExtension)) return NextResponse.json({ error: "Dieser Dateityp ist aus Sicherheitsgründen nicht erlaubt." }, { status: 415 });
  if (file.size > maxUploadMb * 1024 * 1024) return NextResponse.json({ error: `Datei ist größer als ${maxUploadMb} MB` }, { status: 413 });
  if (usedBytes + file.size > limitBytes) return NextResponse.json({ error: `Speicherlimit von ${authorization.tenant.billing.storageLimitMb} MB erreicht` }, { status: 413 });
  if (!allowedTypes.includes(file.type)) return NextResponse.json({ error: "Dateityp ist nicht erlaubt" }, { status: 415 });
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!matchesMagicBytes(file.type, buffer)) return NextResponse.json({ error: "Dateiinhalt passt nicht zum angegebenen Dateityp." }, { status: 415 });

  const extension = extensionFor(file.type);
  const safeName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const relativeUrl = `/uploads/${authorization.tenant.id}/${safeName}`;
  const targetDirectory = path.join(process.cwd(), "public", "uploads", authorization.tenant.id);
  await mkdir(targetDirectory, { recursive: true });
  await writeFile(path.join(targetDirectory, safeName), buffer, { mode: 0o640 });

  if (purpose === "sitePlan") {
    const center = authorization.tenant.map.center;
    const sitePlan = {
      imageUrl: relativeUrl,
      coordinates: [
        [center[0] - 0.001, center[1] + 0.001],
        [center[0] + 0.001, center[1] + 0.001],
        [center[0] + 0.001, center[1] - 0.001],
        [center[0] - 0.001, center[1] - 0.001]
      ] as [[number, number], [number, number], [number, number], [number, number]],
      attribution: "Eigener Lageplan"
    };
    await saveTenantConfiguration(authorization.tenant.id, {
      ...authorization.tenant,
      map: { ...authorization.tenant.map, sitePlan }
    }, authorization.session.email);
    return NextResponse.json({ url: relativeUrl, sitePlan });
  }

  const media = {
    id: crypto.randomUUID(),
    tenantId: authorization.tenant.id,
    title: file.name.replace(/\.[^.]+$/, ""),
    url: relativeUrl,
    type: file.type === "application/pdf" ? "document" as const : file.type.startsWith("video/") ? "video" as const : "image" as const,
    alt: "",
    createdAt: new Date().toISOString(),
    sizeBytes: file.size
  };
  await saveTenantConfiguration(authorization.tenant.id, {
    ...authorization.tenant,
    media: [media, ...authorization.tenant.media].slice(0, 500)
  }, authorization.session.email);
  return NextResponse.json(media);
}

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "local";
}

function extensionFor(type: string) {
  if (type === "image/png") return ".png";
  if (type === "image/jpeg") return ".jpg";
  if (type === "image/webp") return ".webp";
  if (type === "application/pdf") return ".pdf";
  if (type === "video/mp4") return ".mp4";
  if (type === "video/webm") return ".webm";
  return ".bin";
}

function matchesMagicBytes(type: string, buffer: Buffer) {
  if (type === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (type === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (type === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (type === "video/mp4") return buffer.includes(Buffer.from("ftyp"), 4);
  if (type === "video/webm") return buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
  return false;
}
