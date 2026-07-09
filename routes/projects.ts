/**
 * bughq — project management API (per-user).
 *
 * Projects are owned by the authenticated user (`owner_id`). These endpoints
 * back the create-app screen and the dashboard's project switcher. Auth is the
 * bearer token (via the `auth` middleware); the client sends it from
 * localStorage. Each new project gets its own public `ingest_key`.
 */

import { Auth } from '@stacksjs/auth'
import { db } from '@stacksjs/database'
import { route } from '@stacksjs/router'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

// Resolve the authenticated user from the bearer token. The `auth` middleware
// alias does not reliably populate `request.user()` on route handlers (see
// CreateCheckoutAction), so we read the token and resolve it directly.
async function currentUser(request: any): Promise<any | null> {
  const authHeader = request.headers?.get?.('authorization') ?? ''
  const bearer = request.bearerToken?.() ?? authHeader.replace(/^Bearer\s+/i, '')
  if (!bearer)
    return null
  try {
    return await Auth.getUserFromToken(bearer)
  }
  catch {
    return null
  }
}

/** A short, readable, unique project id: slug of the name + a random suffix. */
function newProjectId(name: string): string {
  const slug = (name || 'app')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'app'
  const rand = globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 6)
  return `${slug}-${rand}`
}

/** A public, revocable ingest key (not a secret; ships in client code). */
function newIngestKey(): string {
  return (globalThis.crypto.randomUUID() + globalThis.crypto.randomUUID()).replace(/-/g, '')
}

// List the current user's projects (most recent first).
route.get('/api/projects', async (request: any) => {
  const user = await currentUser(request)
  if (!user)
    return json({ error: 'unauthorized' }, 401)
  const rows = await db.unsafe(
    `SELECT id, name, platform, ingest_key, is_active, created_at
     FROM projects WHERE owner_id = $1
     ORDER BY created_at DESC NULLS LAST, id`,
    [Number(user.id)],
  )
  return json({ projects: rows ?? [] })
})

// Create a project owned by the current user.
route.post('/api/projects', async (request: any) => {
  const user = await currentUser(request)
  if (!user)
    return json({ error: 'unauthorized' }, 401)

  const body = request.jsonBody ?? {}
  const name = String(body.name ?? '').trim()
  if (!name)
    return json({ error: 'Project name is required.' }, 400)
  if (name.length > 255)
    return json({ error: 'Project name is too long.' }, 400)

  const platform = String(body.platform ?? 'javascript').slice(0, 60)
  const id = newProjectId(name)
  const ingestKey = newIngestKey()

  await db.insertInto('projects').values({
    id,
    name,
    platform,
    ingest_key: ingestKey,
    owner_id: Number(user.id),
    is_active: true,
  }).execute()

  return json({ project: { id, name, platform, ingest_key: ingestKey } }, 201)
}).skipCsrf()
