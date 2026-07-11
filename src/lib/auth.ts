import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/lib/types";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@schellenberger.biz";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "development-only-secret-change-before-production"
);

export type AppSession = {
  email: string;
  role: UserRole;
  tenantId?: string;
};

export async function createAdminSession(email: string) {
  return createSession({ email, role: "platform-admin" });
}

export async function createSession(session: AppSession) {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
}

export async function verifySession(token?: string): Promise<AppSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.email !== "string" || typeof payload.role !== "string") return null;
    if (!["platform-admin", "tenant-owner", "tenant-editor", "tenant-viewer"].includes(payload.role)) return null;
    return {
      email: payload.email,
      role: payload.role as UserRole,
      tenantId: typeof payload.tenantId === "string" ? payload.tenantId : undefined
    };
  } catch {
    return null;
  }
}

export async function verifyAdminSession(token?: string) {
  const session = await verifySession(token);
  if (!session) return null;
  return canAccessAdmin(session) ? session : null;
}

export function canAccessAdmin(session: AppSession) {
  return session.role === "platform-admin" || session.role === "tenant-owner" || session.role === "tenant-editor" || session.role === "tenant-viewer";
}

export function canManageTenant(session: AppSession, tenantId: string) {
  if (session.role === "platform-admin" && session.email.toLowerCase() === getAdminEmail().toLowerCase()) return true;
  return Boolean(session.tenantId === tenantId && (session.role === "tenant-owner" || session.role === "tenant-editor"));
}

export function canViewTenant(session: AppSession, tenantId: string) {
  if (canManageTenant(session, tenantId)) return true;
  return session.tenantId === tenantId && session.role === "tenant-viewer";
}

export function getAdminEmail() {
  return process.env.ADMIN_EMAIL ?? "admin@schellenberger.biz";
}

export function isPlatformAdminSession(session: AppSession | null | undefined) {
  return Boolean(session?.role === "platform-admin" && session.email.toLowerCase() === getAdminEmail().toLowerCase());
}
