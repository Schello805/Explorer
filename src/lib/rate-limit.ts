type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const maxBuckets = 10_000;
const cleanupIntervalMs = 60_000;
let lastCleanupAt = 0;

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  cleanupBuckets(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 };
  }
  if (bucket.count >= limit) return { ok: false, remaining: 0, retryAfterMs: Math.max(0, bucket.resetAt - now) };
  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count, retryAfterMs: 0 };
}

function cleanupBuckets(now: number) {
  if (now - lastCleanupAt < cleanupIntervalMs && buckets.size <= maxBuckets) return;
  lastCleanupAt = now;
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size <= maxBuckets) return;
  for (const key of buckets.keys()) {
    buckets.delete(key);
    if (buckets.size <= maxBuckets) return;
  }
}
