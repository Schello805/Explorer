import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/admin/login", request.url));
  response.cookies.set("platzguide_session", "", { httpOnly: true, expires: new Date(0), path: "/" });
  response.cookies.set("explorer_session", "", { httpOnly: true, expires: new Date(0), path: "/" });
  return response;
}
