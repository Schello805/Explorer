import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { z } from "zod";
import { createAdminSession, createSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
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
  const ip = clientIp(request);
  const ipLimit = rateLimit(`login:ip:${ip}`, 30, 15 * 60 * 1000);
  const accountLimit = rateLimit(`login:account:${email}:${ip}`, 8, 15 * 60 * 1000);
  if (!ipLimit.ok || !accountLimit.ok) {
    return NextResponse.json({ error: "Zu viele Login-Versuche. Bitte später erneut versuchen." }, { status: 429 });
  }

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
    secure: shouldUseSecureCookie(request),
    path: "/",
    maxAge: 60 * 60 * 8
  });
  return response;
}

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "local";
}

function shouldUseSecureCookie(request: Request) {
  if (process.env.AUTH_COOKIE_SECURE === "true") return true;
  if (process.env.AUTH_COOKIE_SECURE === "false") return false;
  if (process.env.NEXT_PUBLIC_BASE_URL?.startsWith("https://")) return true;
  return new URL(request.url).protocol === "https:";
}

async function getAdminConfig() {
  const fileEnv = await readEnvLocal();
  const preferProcessEnv = process.env.PLAYWRIGHT_TEST === "1";
  const passwordHash = preferProcessEnv
    ? process.env.ADMIN_PASSWORD_HASH || fileEnv.ADMIN_PASSWORD_HASH || ""
    : fileEnv.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD_HASH || "";
  const email = preferProcessEnv
    ? process.env.ADMIN_EMAIL || fileEnv.ADMIN_EMAIL || "admin@schellenberger.biz"
    : fileEnv.ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@schellenberger.biz";
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
