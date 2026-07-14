/**
 * Abuse controls for the public ingest.
 *
 * The ingest key is public by design (it ships in client code, Sentry-DSN
 * style), so `POST /errors` is reachable by anyone who reads it from a bundle.
 * The key gate proves *which* project, not *that the caller is trusted* - so we
 * layer quotas on top: a flood from Postman/a script must not exhaust storage,
 * pollute the dashboard, or email-bomb the owner.
 *
 * These limiters are in-memory (per process): zero-dependency and fine for the
 * single-instance local-dev phase and a single deployed node. A multi-instance
 * deployment should back them with a shared store (Redis via @stacksjs/cache);
 * the call sites here stay the same.
 */

interface Window {
  count: number
  resetAt: number
}

const windows = new Map<string, Window>()

/**
 * Fixed-window counter. Returns whether the hit is allowed and, when not, the
 * seconds until the window resets (for a `Retry-After` header).
 */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean, retryAfter: number } {
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

/**
 * Per-project alert-email throttle. New-issue and regression alerts fire per
 * distinct fingerprint, so a flood of unique messages would otherwise send one
 * email each. Cap the alert rate per project; returns false once the cap for
 * the current hour is hit.
 */
const ALERTS_PER_HOUR = 15
export function allowAlert(projectId: string): boolean {
  const { ok } = rateLimit(`alert:${projectId}`, ALERTS_PER_HOUR, 3_600_000)
  return ok
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
