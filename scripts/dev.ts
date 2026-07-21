#!/usr/bin/env bun
/**
 * Fast local dev for this frontend-less stx app.
 *
 * `./buddy dev` advertises a Vue/Vite frontend on :3100 that never binds for
 * a pure-stx app, then blocks the "ready" banner on a hardcoded 30s timeout
 * (readinessTimeoutMs in @stacksjs/buddy) — ~46s to boot, and the :3100 URL it
 * prints refuses connections. See stacksjs/stacks#2036.
 *
 * This starts the two servers that actually matter, directly, in ~2s:
 *   - API / SSR pages      → :3108  (@stacksjs/actions dev/api.js)
 *   - Views + public assets → :3100 (@stacksjs/actions dev/views.js)
 *
 * Open http://localhost:3100 — the views server serves public/marketing.css
 * and proxies app/SSR routes to the API, so the whole styled site is there.
 */
const env = { ...process.env, STACKS_DEV_SERVER: '1' }
const opts = { env, stdout: 'inherit', stderr: 'inherit' } as const

const api = Bun.spawn(['bun', 'node_modules/@stacksjs/actions/dist/dev/api.js'], opts)
const views = Bun.spawn(['bun', 'node_modules/@stacksjs/actions/dist/dev/views.js'], opts)

console.log('\n  bughq dev\n    → http://localhost:3100   (full styled site: app + marketing)\n    → http://localhost:3108   (API only)\n')

function shutdown() {
  api.kill()
  views.kill()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

// If either server exits on its own, tear the other down too.
await Promise.race([api.exited, views.exited])
shutdown()
