import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { z } from "zod";
import { createAdminSession, createSession } from "@/lib/auth";
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
  const adminConfig = await getAdminConfig();
  let token: string | null = null;

  if (email === adminConfig.email.toLowerCase()) {
    const hash = adminConfig.passwordHash;
    const developmentMatch = process.env.NODE_ENV !== "production" && parsed.data.password === "platzguide-admin";
    const passwordMatches = hash ? await compare(parsed.data.password, hash) : developmentMatch;
    if (passwordMatches) token = await createAdminSession(parsed.data.email);
    else console.warn("Admin login failed", {
      email,
      expectedEmail: adminConfig.email.toLowerCase(),
      hasPasswordHash: Boolean(hash),
      passwordHashSource: adminConfig.source,
      nodeEnv: process.env.NODE_ENV
    });
  } else {
    console.warn("Admin login skipped: email mismatch", {
      email,
      expectedEmail: adminConfig.email.toLowerCase()
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

async function getAdminConfig() {
  const fileEnv = await readEnvLocal();
  const passwordHash = fileEnv.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD_HASH || "";
  const email = fileEnv.ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@schellenberger.biz";
  return {
    email,
    passwordHash,
    source: fileEnv.ADMIN_PASSWORD_HASH ? ".env.local" : process.env.ADMIN_PASSWORD_HASH ? "process.env" : "missing"
  };
}

async function readEnvLocal() {
  try {
    const content = await readFile(path.join(process.cwd(), ".env.local"), "utf8");
    return Object.fromEntries(content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })) as Record<string, string>;
  } catch {
    return {};
  }
}
