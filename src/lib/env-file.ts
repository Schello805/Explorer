import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");

export async function readEnvLocal() {
  try {
    return parseEnv(await readFile(envPath, "utf8"));
  } catch {
    return {};
  }
}

export async function updateEnvLocal(values: Record<string, string>) {
  let content = "";
  try {
    content = await readFile(envPath, "utf8");
  } catch {
    content = "";
  }
  const lines = content.split(/\r?\n/);
  const seen = new Set<string>();
  const nextLines = lines.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/);
    if (!match || !(match[1] in values)) return line;
    seen.add(match[1]);
    return `${match[1]}=${formatEnvValue(values[match[1]])}`;
  });
  for (const [key, value] of Object.entries(values)) {
    if (!seen.has(key)) nextLines.push(`${key}=${formatEnvValue(value)}`);
    process.env[key] = value;
  }
  await writeFile(envPath, `${nextLines.filter((line, index) => line || index < nextLines.length - 1).join("\n")}\n`, "utf8");
}

function parseEnv(content: string) {
  const result: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index);
    let value = line.slice(index + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).replaceAll('\\"', '"').replaceAll("\\'", "'");
    }
    result[key] = value;
  }
  return result;
}

function formatEnvValue(value: string) {
  return /^[A-Za-z0-9_@./:+-]*$/.test(value) ? value : JSON.stringify(value);
}
