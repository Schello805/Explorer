import "server-only";

import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { listTenants } from "@/lib/tenant-store";

export type CleanupCandidate = {
  tenantId: string;
  file: string;
  url: string;
  sizeBytes: number;
};

export async function cleanupUnusedUploads(dryRun: boolean) {
  const tenants = await listTenants();
  const uploadsRoot = path.join(process.cwd(), "public", "uploads");
  const referencedUrls = new Set<string>();
  for (const tenant of tenants) {
    for (const asset of tenant.media) referencedUrls.add(asset.url);
    if (tenant.map.sitePlan?.imageUrl) referencedUrls.add(tenant.map.sitePlan.imageUrl);
  }

  const candidates: CleanupCandidate[] = [];
  for (const tenant of tenants) {
    const tenantDirectory = path.join(uploadsRoot, tenant.id);
    const files = await readdir(tenantDirectory).catch(() => []);
    for (const file of files) {
      const filePath = path.join(tenantDirectory, file);
      if (!filePath.startsWith(tenantDirectory + path.sep)) continue;
      const fileStat = await stat(filePath).catch(() => null);
      if (!fileStat?.isFile()) continue;
      const url = `/uploads/${tenant.id}/${file}`;
      if (!referencedUrls.has(url)) candidates.push({ tenantId: tenant.id, file, url, sizeBytes: fileStat.size });
    }
  }

  if (!dryRun) {
    for (const candidate of candidates) {
      const tenantDirectory = path.join(uploadsRoot, candidate.tenantId);
      const filePath = path.join(tenantDirectory, candidate.file);
      if (filePath.startsWith(tenantDirectory + path.sep)) await unlink(filePath).catch(() => undefined);
    }
  }

  return {
    dryRun,
    deleted: dryRun ? 0 : candidates.length,
    candidates,
    reclaimableBytes: candidates.reduce((sum, item) => sum + item.sizeBytes, 0),
    checkedAt: new Date().toISOString()
  };
}
