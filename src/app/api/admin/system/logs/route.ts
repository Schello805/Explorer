import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { authorizePlatformAdmin } from "@/lib/platform-admin";

const execFileAsync = promisify(execFile);

export async function GET(request: Request) {
  const session = await authorizePlatformAdmin();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const url = new URL(request.url);
  const lines = Math.min(Math.max(Number(url.searchParams.get("lines") ?? 120), 20), 300);
  const unit = process.env.PLATZGUIDE_SYSTEMD_UNIT ?? "platzguide";

  try {
    const { stdout } = await execFileAsync("journalctl", ["-u", unit, "-n", String(lines), "--no-pager", "-o", "short-iso"], {
      timeout: 5000,
      maxBuffer: 256 * 1024
    });
    return NextResponse.json({
      unit,
      lines: stdout.split("\n").filter(Boolean).slice(-lines),
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Logs konnten nicht geladen werden.";
    return NextResponse.json({
      unit,
      lines: [],
      warning: "journalctl ist in dieser Umgebung nicht verfügbar oder nicht berechtigt.",
      detail: message,
      checkedAt: new Date().toISOString()
    });
  }
}
