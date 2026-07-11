import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { createAdminSession, createSession, getAdminEmail, isPlatformAdminSession, verifyAdminSession } from "@/lib/auth";
import { readEnvLocal, updateEnvLocal } from "@/lib/env-file";
import { listTenants, saveTenantConfiguration } from "@/lib/tenant-store";

const accountUpdateSchema = z.object({
  email: z.string().trim().email(),
  currentPassword: z.string().min(8).max(200),
  newPassword: z.string().min(12).max(200).optional().or(z.literal(""))
});

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const session = await verifyAdminSession(
    cookieStore.get("platzguide_session")?.value ?? cookieStore.get("explorer_session")?.value
  );
  if (!session) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const parsed = accountUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Bitte prüfe E-Mail und Passwortfelder." }, { status: 400 });

  const nextEmail = parsed.data.email.toLowerCase();
  const nextPasswordHash = parsed.data.newPassword ? await hash(parsed.data.newPassword, 12) : undefined;
  const tenants = await listTenants();

  if (isPlatformAdminSession(session)) {
    const adminConfig = await getPlatformAdminConfig();
    const passwordMatches = adminConfig.passwordHash
      ? await compare(parsed.data.currentPassword, adminConfig.passwordHash)
      : process.env.NODE_ENV !== "production" && parsed.data.currentPassword === "platzguide-admin";
    if (!passwordMatches) return NextResponse.json({ error: "Das aktuelle Passwort ist nicht korrekt." }, { status: 403 });
    if (tenants.some((tenant) => tenant.users.some((user) => user.email.toLowerCase() === nextEmail))) {
      return NextResponse.json({ error: "Diese E-Mail wird bereits von einem Mandantenadmin genutzt." }, { status: 409 });
    }

    await updateEnvLocal({
      ADMIN_EMAIL: nextEmail,
      ...(nextPasswordHash ? { ADMIN_PASSWORD_HASH: nextPasswordHash } : {})
    });
    const response = NextResponse.json({ ok: true, email: nextEmail, role: "platform-admin" });
    response.cookies.set("platzguide_session", await createAdminSession(nextEmail), cookieOptions(request));
    return response;
  }

  if (!session.tenantId) return NextResponse.json({ error: "Kein Mandant zugeordnet." }, { status: 403 });
  const tenant = tenants.find((candidate) => candidate.id === session.tenantId);
  if (!tenant) return NextResponse.json({ error: "Mandant nicht gefunden." }, { status: 404 });
  const user = tenant.users.find((candidate) => candidate.email.toLowerCase() === session.email.toLowerCase());
  if (!user?.passwordHash) return NextResponse.json({ error: "Account nicht gefunden." }, { status: 404 });
  if (!await compare(parsed.data.currentPassword, user.passwordHash)) {
    return NextResponse.json({ error: "Das aktuelle Passwort ist nicht korrekt." }, { status: 403 });
  }
  if (nextEmail === getAdminEmail().toLowerCase() || tenants.some((candidateTenant) => candidateTenant.users.some((candidateUser) => candidateUser.id !== user.id && candidateUser.email.toLowerCase() === nextEmail))) {
    return NextResponse.json({ error: "Diese E-Mail wird bereits verwendet." }, { status: 409 });
  }

  const updatedTenant = {
    ...tenant,
    users: tenant.users.map((candidate) => candidate.id === user.id
      ? {
          ...candidate,
          email: nextEmail,
          ...(nextPasswordHash ? { passwordHash: nextPasswordHash } : {})
        }
      : candidate),
    auditLog: [{
      id: crypto.randomUUID(),
      tenantId: tenant.id,
      actorEmail: session.email,
      action: "account-update",
      entityType: "tenant-user",
      entityId: user.id,
      createdAt: new Date().toISOString()
    }, ...tenant.auditLog].slice(0, 100)
  };
  await saveTenantConfiguration(tenant.id, updatedTenant, session.email);

  const response = NextResponse.json({ ok: true, email: nextEmail, role: user.role });
  response.cookies.set("platzguide_session", await createSession({ email: nextEmail, role: user.role, tenantId: tenant.id }), cookieOptions(request));
  return response;
}

async function getPlatformAdminConfig() {
  const fileEnv = await readEnvLocal();
  return {
    email: fileEnv.ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@schellenberger.biz",
    passwordHash: fileEnv.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD_HASH || ""
  };
}

function cookieOptions(request: Request) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.AUTH_COOKIE_SECURE === "true" || (process.env.AUTH_COOKIE_SECURE !== "false" && (process.env.NEXT_PUBLIC_BASE_URL?.startsWith("https://") || new URL(request.url).protocol === "https:")),
    path: "/",
    maxAge: 60 * 60 * 8
  };
}
