import { SignJWT, jwtVerify } from "jose";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@schellenberger.biz";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "development-only-secret-change-before-production"
);

export async function createAdminSession(email: string) {
  return new SignJWT({ email, role: "platform-admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
}

export async function verifyAdminSession(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.email === ADMIN_EMAIL && payload.role === "platform-admin"
      ? payload
      : null;
  } catch {
    return null;
  }
}
