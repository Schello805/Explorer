import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { z } from "zod";
import { ADMIN_EMAIL, createAdminSession } from "@/lib/auth";

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200)
});

export async function POST(request: Request) {
  const parsed = credentials.safeParse(await request.json());
  if (!parsed.success || parsed.data.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: "E-Mail oder Passwort ist nicht korrekt." }, { status: 401 });
  }

  const hash = process.env.ADMIN_PASSWORD_HASH;
  const developmentMatch = process.env.NODE_ENV !== "production" && parsed.data.password === "platzguide-admin";
  const passwordMatches = hash ? await compare(parsed.data.password, hash) : developmentMatch;
  if (!passwordMatches) {
    return NextResponse.json({ error: "E-Mail oder Passwort ist nicht korrekt." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("platzguide_session", await createAdminSession(parsed.data.email), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });
  return response;
}
