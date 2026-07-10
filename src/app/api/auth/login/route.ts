import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { z } from "zod";
import { ADMIN_EMAIL, createAdminSession, createSession } from "@/lib/auth";
import { findTenantUser } from "@/lib/tenant-store";

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200)
});

export async function POST(request: Request) {
  const parsed = credentials.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "E-Mail oder Passwort ist nicht korrekt." }, { status: 401 });
  }

  const email = parsed.data.email.toLowerCase();
  let token: string | null = null;

  if (email === ADMIN_EMAIL.toLowerCase()) {
    const hash = process.env.ADMIN_PASSWORD_HASH;
    const developmentMatch = process.env.NODE_ENV !== "production" && parsed.data.password === "platzguide-admin";
    const passwordMatches = hash ? await compare(parsed.data.password, hash) : developmentMatch;
    if (passwordMatches) token = await createAdminSession(parsed.data.email);
    else console.warn("Admin login failed", {
      email,
      expectedEmail: ADMIN_EMAIL.toLowerCase(),
      hasPasswordHash: Boolean(hash),
      nodeEnv: process.env.NODE_ENV
    });
  } else {
    console.warn("Admin login skipped: email mismatch", {
      email,
      expectedEmail: ADMIN_EMAIL.toLowerCase()
    });
  }

  if (!token) {
    const tenantUser = await findTenantUser(email);
    if (tenantUser?.user.passwordHash && !tenantUser.user.emailVerifiedAt) {
      return NextResponse.json({ error: "Bitte bestätige zuerst deine E-Mail-Adresse." }, { status: 403 });
    }
    if (tenantUser?.user.passwordHash && await compare(parsed.data.password, tenantUser.user.passwordHash)) {
      token = await createSession({
        email: tenantUser.user.email,
        role: tenantUser.user.role,
        tenantId: tenantUser.tenant.id
      });
    }
  }

  if (!token) return NextResponse.json({ error: "E-Mail oder Passwort ist nicht korrekt." }, { status: 401 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set("platzguide_session", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });
  return response;
}
