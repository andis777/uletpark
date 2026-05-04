/**
 * Rate limiter — in-memory + опционально Vercel Runtime Cache.
 *
 * В serverless окружении Fluid Compute переиспользует инстансы между запросами,
 * поэтому Map в памяти живёт дольше нескольких секунд. Для строгих лимитов через
 * множество regions использовать @upstash/ratelimit или Vercel Runtime Cache.
 *
 * Пример:
 *   const limit = await checkRateLimit(`otp:${phone}`, 3, 60_000 * 10);
 *   if (!limit.ok) return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });
 */

interface Bucket { count: number; resetAt: number; }
const buckets = new Map<string, Bucket>();

const SWEEP_INTERVAL_MS = 60_000;
let lastSweep = Date.now();

function sweep() {
  if (Date.now() - lastSweep < SWEEP_INTERVAL_MS) return;
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (b.resetAt < now) buckets.delete(k);
  }
  lastSweep = Date.now();
}

export interface LimitResult { ok: boolean; remaining: number; resetAt: number; }

export async function checkRateLimit(key: string, max: number, windowMs: number): Promise<LimitResult> {
  sweep();
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.resetAt < now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  return {
    ok: b.count <= max,
    remaining: Math.max(0, max - b.count),
    resetAt: b.resetAt,
  };
}

/* Достаём IP клиента из заголовков Vercel/прокси */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
