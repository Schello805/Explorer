import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { canManageTenant, verifyAdminSession } from "@/lib/auth";
import { resolveTenant } from "@/lib/tenant-resolver";
import { listTenants, saveTenantConfiguration } from "@/lib/tenant-store";

const fallbackTypes = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

async function authorize() {
  const cookieStore = await cookies();
  const session = await verifyAdminSession(
    cookieStore.get("platzguide_session")?.value ?? cookieStore.get("explorer_session")?.value
  );
  if (!session) return null;
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost";
  const tenants = await listTenants();
  const normalized = host.split(":")[0];
  const tenant = tenants.find((candidate) => candidate.hosts.includes(normalized))
    ?? tenants.find((candidate) => candidate.slug === normalized.split(".")[0])
    ?? resolveTenant(host, tenants);
  return canManageTenant(session, tenant.id) ? { session, tenant } : null;
}

export async function POST(request: Request) {
  const authorization = await authorize();
  if (!authorization) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  const purpose = String(formData.get("purpose") ?? "media");
  if (!(file instanceof File)) return NextResponse.json({ error: "Datei fehlt" }, { status: 400 });

  const maxUploadMb = authorization.tenant.integrations.storage.maxUploadMb || Number(process.env.UPLOAD_MAX_MB ?? 10);
  const allowedTypes = authorization.tenant.integrations.storage.allowedTypes.length
    ? authorization.tenant.integrations.storage.allowedTypes
    : fallbackTypes;
  if (file.size > maxUploadMb * 1024 * 1024) return NextResponse.json({ error: `Datei ist größer als ${maxUploadMb} MB` }, { status: 413 });
  if (!allowedTypes.includes(file.type)) return NextResponse.json({ error: "Dateityp ist nicht erlaubt" }, { status: 415 });

  const extension = extensionFor(file.type);
  const safeName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const relativeUrl = `/uploads/${authorization.tenant.id}/${safeName}`;
  const targetDirectory = path.join(process.cwd(), "public", "uploads", authorization.tenant.id);
  await mkdir(targetDirectory, { recursive: true });
  await writeFile(path.join(targetDirectory, safeName), Buffer.from(await file.arrayBuffer()), { mode: 0o640 });

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
    type: file.type === "application/pdf" ? "document" as const : "image" as const,
    alt: "",
    createdAt: new Date().toISOString()
  };
  await saveTenantConfiguration(authorization.tenant.id, {
    ...authorization.tenant,
    media: [media, ...authorization.tenant.media].slice(0, 500)
  }, authorization.session.email);
  return NextResponse.json(media);
}

function extensionFor(type: string) {
  if (type === "image/png") return ".png";
  if (type === "image/jpeg") return ".jpg";
  if (type === "image/webp") return ".webp";
  if (type === "application/pdf") return ".pdf";
  return ".bin";
}
