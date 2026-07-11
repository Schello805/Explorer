import "server-only";

import { cookies } from "next/headers";
import { ADMIN_EMAIL, verifyAdminSession } from "@/lib/auth";

export async function authorizePlatformAdmin() {
  const cookieStore = await cookies();
  const session = await verifyAdminSession(
    cookieStore.get("platzguide_session")?.value ?? cookieStore.get("explorer_session")?.value
  );
  if (!session || session.role !== "platform-admin" || session.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return null;
  return session;
}
