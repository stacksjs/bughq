import { RedisClient } from 'bun'

/**
 * Abuse controls for the public ingest.
 *
 * The ingest key is public by design (it ships in client code, Sentry-DSN
 * style), so `POST /errors` is reachable by anyone who reads it from a bundle.
 * The key gate proves *which* project, not *that the caller is trusted* - so we
 * layer quotas on top: a flood from Postman/a script must not exhaust storage,
 * pollute the dashboard, or email-bomb the owner.
 *
 * Two backends behind one API:
 * - **In-memory** (default): a per-process fixed window. Correct and fast for a
 *   single node; the quotas simply don't coordinate across instances.
 * - **Shared Redis** (when REDIS_URL, or CACHE_DRIVER=redis + REDIS_HOST/PORT/…
 *   is set): an atomic INCR/EXPIRE window shared by every app instance — the
 *   multi-node story. Any Redis error trips a short circuit-breaker and falls
 *   back to the in-memory limiter, so a cache outage degrades gracefully rather
 *   than taking the ingest down (fail-open).
 */

// ── In-memory fixed window (single node / Redis fallback) ────────────────────
interface Window {
  count: number
  resetAt: number
}
const windows = new Map<string, Window>()

function memRateLimit(key: string, limit: number, windowMs: number): { ok: boolean, retryAfter: number } {
  const nowMs = Date.now()
  const w = windows.get(key)
  if (!w || nowMs >= w.resetAt) {
    windows.set(key, { count: 1, resetAt: nowMs + windowMs })
    return { ok: true, retryAfter: 0 }
  }
  if (w.count >= limit)
    return { ok: false, retryAfter: Math.max(1, Math.ceil((w.resetAt - nowMs) / 1000)) }
  w.count += 1
  return { ok: true, retryAfter: 0 }
}

// Evict stale windows so the map can't grow without bound under a wide attack
// (many distinct project/IP keys). Cheap sweep on an interval; unref so it
// never keeps the process alive.
const sweep = setInterval(() => {
  const nowMs = Date.now()
  for (const [k, w] of windows) {
    if (nowMs >= w.resetAt)
      windows.delete(k)
  }
}, 60_000)
if (typeof sweep === 'object' && sweep && 'unref' in sweep)
  (sweep as { unref: () => void }).unref()

// ── Optional shared Redis backend ────────────────────────────────────────────
function redisUrl(): string {
  if (process.env.REDIS_URL)
    return String(process.env.REDIS_URL)
  if (String(process.env.CACHE_DRIVER) === 'redis') {
    const host = process.env.REDIS_HOST || '127.0.0.1'
    const port = process.env.REDIS_PORT || '6379'
    const auth = process.env.REDIS_PASSWORD ? `:${encodeURIComponent(String(process.env.REDIS_PASSWORD))}@` : ''
    const proto = String(process.env.REDIS_TLS) === 'true' ? 'rediss' : 'redis'
    return `${proto}://${auth}${host}:${port}`
  }
  return ''
}

let client: RedisClient | null = null
const url = redisUrl()
if (url) {
  try {
    client = new RedisClient(url, { connectionTimeout: 500 })
  }
  catch {
    client = null
  }
}
// When a Redis op fails, skip Redis entirely for this long so we don't pay a
// connection timeout on every request while it's down.
let redisDownUntil = 0

async function redisRateLimit(key: string, limit: number, windowMs: number): Promise<{ ok: boolean, retryAfter: number } | null> {
  if (!client || Date.now() < redisDownUntil)
    return null
  const cacheKey = `ratelimit:${key}`
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000))
  try {
    const n = Number(await client.incr(cacheKey))
    if (n === 1)
      await client.expire(cacheKey, windowSec)
    if (n > limit) {
      let ttl = windowSec
      try {
        ttl = Number(await client.ttl(cacheKey))
      }
      catch { /* keep the window default */ }
      return { ok: false, retryAfter: Math.max(1, ttl || windowSec) }
    }
    return { ok: true, retryAfter: 0 }
  }
  catch (err) {
    redisDownUntil = Date.now() + 30_000
    console.error('[limits] redis unavailable, using in-memory limiter for 30s:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Fixed-window counter. Returns whether the hit is allowed and, when not, the
 * seconds until the window resets (for a `Retry-After` header). Uses the shared
 * Redis window when configured, else the in-memory one; Redis failures fall
 * back to in-memory (fail-open, never blocks the ingest on a cache outage).
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<{ ok: boolean, retryAfter: number }> {
  const viaRedis = await redisRateLimit(key, limit, windowMs)
  return viaRedis ?? memRateLimit(key, limit, windowMs)
}

/**
 * Per-project alert-email throttle. New-issue and regression alerts fire per
 * distinct fingerprint, so a flood of unique messages would otherwise send one
 * email each. Cap the alert rate per project; returns false once the cap for
 * the current hour is hit.
 */
const ALERTS_PER_HOUR = 15
export async function allowAlert(projectId: string): Promise<boolean> {
  const { ok } = await rateLimit(`alert:${projectId}`, ALERTS_PER_HOUR, 3_600_000)
  return ok
}
