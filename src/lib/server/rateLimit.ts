import "server-only";
import { getDb } from "@/lib/server/db";

/**
 * Daily request limits per route group. Each group has a cap per caller (by IP)
 * and a cap for everyone together, so a spammer rotating IPs still can't run up
 * the bill past `total`. Override with RATE_LIMIT_<GROUP>_PER_IP / _TOTAL.
 */
const LIMITS = {
  /** Every route that calls an LLM on the server's key. */
  ai: { perIp: 50, total: 1000 },
  /** Unsplash search and download pings (Unsplash allows 50/hour on demo keys). */
  stock: { perIp: 200, total: 5000 },
  /** Image proxy for Figma export. */
  image: { perIp: 500, total: 20000 },
  /** Reading a brand from a public website. */
  import: { perIp: 20, total: 300 },
} as const;

export type RateLimitGroup = keyof typeof LIMITS;

function limitFor(group: RateLimitGroup, kind: "perIp" | "total"): number {
  const env = process.env[`RATE_LIMIT_${group.toUpperCase()}_${kind === "perIp" ? "PER_IP" : "TOTAL"}`];
  const value = Number(env);
  return env && Number.isFinite(value) && value >= 0 ? value : LIMITS[group][kind];
}

/** Vercel puts the caller's address in x-real-ip and first in x-forwarded-for. */
export function clientIp(request: Request): string {
  return request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

const today = () => new Date().toISOString().slice(0, 10);

/** Fallback when there's no database (local dev) or it fails: counts per server instance. */
const memory = new Map<string, { day: string; count: number }>();
function countInMemory(keys: string[]): number[] {
  const day = today();
  if (memory.size > 10_000) for (const [key, entry] of memory) if (entry.day !== day) memory.delete(key);
  return keys.map((key) => {
    const entry = memory.get(key);
    const next = entry?.day === day ? entry.count + 1 : 1;
    memory.set(key, { day, count: next });
    return next;
  });
}

async function count(keys: string[]): Promise<number[]> {
  const db = getDb();
  if (!db) return countInMemory(keys);
  try {
    const rows = await db.query<{ key: string; count: number }>(
      `INSERT INTO rate_limits (key, day, count)
       SELECT k, (now() AT TIME ZONE 'UTC')::date, 1 FROM unnest($1::text[]) AS k
       ON CONFLICT (key, day) DO UPDATE SET count = rate_limits.count + 1
       RETURNING key, count`,
      [keys],
    );
    // Now and then, drop counters from previous days.
    if (Math.random() < 0.01) void db.query(`DELETE FROM rate_limits WHERE day < (now() AT TIME ZONE 'UTC')::date - 2`).catch(() => {});
    const byKey = new Map(rows.map((row) => [row.key, Number(row.count)]));
    return keys.map((key) => byKey.get(key) ?? 0);
  } catch (error) {
    console.error("Rate limit store failed; counting in memory", error);
    return countInMemory(keys);
  }
}

function secondsUntilUtcMidnight(): number {
  const now = new Date();
  return Math.max(1, Math.ceil((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - now.getTime()) / 1000));
}

/**
 * Count this request against the group's daily limits. Returns a 429 response
 * when over a limit (send it back as-is), or null to carry on.
 */
export async function dailyRateLimit(request: Request, group: RateLimitGroup): Promise<Response | null> {
  const perIp = limitFor(group, "perIp");
  const total = limitFor(group, "total");
  const headers = { "Retry-After": String(secondsUntilUtcMidnight()) };
  const [ipCount] = await count([`${group}:ip:${clientIp(request)}`]);
  if (ipCount > perIp) {
    return Response.json({ error: `You've reached today's limit of ${perIp} requests for this feature. It resets at midnight UTC.` }, { status: 429, headers });
  }
  // Only requests that pass the per-IP check count toward the shared total,
  // so one blocked spammer can't use up everyone else's quota.
  const [totalCount] = await count([`${group}:all`]);
  if (totalCount > total) {
    return Response.json({ error: "This feature is busy today and has hit its daily limit. Please try again tomorrow." }, { status: 429, headers });
  }
  return null;
}
