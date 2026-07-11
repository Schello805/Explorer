import "server-only";

import { cookies } from "next/headers";
import { isPlatformAdminSession, verifyAdminSession } from "@/lib/auth";

export async function authorizePlatformAdmin() {
  const cookieStore = await cookies();
  const session = await verifyAdminSession(
    cookieStore.get("platzguide_session")?.value ?? cookieStore.get("explorer_session")?.value
  );
  if (!isPlatformAdminSession(session)) return null;
  return session;
}
