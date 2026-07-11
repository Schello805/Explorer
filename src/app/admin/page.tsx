import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_EMAIL, verifyAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = await verifyAdminSession(
    cookieStore.get("platzguide_session")?.value ?? cookieStore.get("explorer_session")?.value
  );
  if (!session) redirect("/admin/login");
  if (session.role === "platform-admin" && session.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) redirect("/admin/platform");
  redirect("/admin/tenant");
}
