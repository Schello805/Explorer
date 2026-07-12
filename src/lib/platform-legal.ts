import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { tenantDefaults } from "@/lib/tenant-defaults";

export type PlatformLegal = {
  imprint: string;
  privacy: string;
  cookies: string;
  terms: string;
};

const dataDirectory = process.env.PLATZGUIDE_DATA_DIR ?? path.join(process.cwd(), ".data");
const legalFile = path.join(dataDirectory, "platform-legal.json");

export async function readPlatformLegal(): Promise<PlatformLegal> {
  try {
    return { ...tenantDefaults.legal, ...JSON.parse(await readFile(legalFile, "utf8")) };
  } catch {
    return tenantDefaults.legal;
  }
}

export async function writePlatformLegal(legal: PlatformLegal) {
  await mkdir(dataDirectory, { recursive: true });
  const temporaryFile = `${legalFile}.tmp`;
  await writeFile(temporaryFile, JSON.stringify(legal, null, 2));
  await rename(temporaryFile, legalFile);
  return legal;
}
