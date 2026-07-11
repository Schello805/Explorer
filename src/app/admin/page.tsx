import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isPlatformAdminSession, verifyAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = await verifyAdminSession(
    cookieStore.get("platzguide_session")?.value ?? cookieStore.get("explorer_session")?.value
  );
  if (!session) redirect("/admin/login");
  if (isPlatformAdminSession(session)) redirect("/admin/platform");
  redirect("/admin/tenant");
}
