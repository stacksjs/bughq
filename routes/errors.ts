/**
 * bughq — error ingest + issue API.
 *
 * The browser/server SDK (served at `/sdk.js`) POSTs captured errors to
 * `/errors`. Each event is fingerprinted and rolled up into an Issue (the
 * triage unit). The dashboard reads issues from `GET /api/projects/{id}/issues`.
 * Storage is Postgres, queried through bun-query-builder's `db`.
 */

import { Auth } from '@stacksjs/auth'
import { db } from '@stacksjs/database'
import { response, route } from '@stacksjs/router'
import { categorize, culprit, fingerprint, issueTitle, randomId } from '../app/Errors/fingerprint'
import { authorizeIngest } from '../app/Errors/ingest'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-BugHQ-Key',
  'Access-Control-Max-Age': '86400',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS } })
}

// Resolve the current user from a bearer token (API calls) or the `token`
// cookie (the resolve form posts with cookies, no bearer). Used to owner-scope
// the issue endpoints so no tenant can read/mutate another tenant's issues.
async function userFromRequest(request: any): Promise<any | null> {
  const authHeader = request.headers?.get?.('authorization') ?? ''
  let token = request.bearerToken?.() ?? authHeader.replace(/^Bearer\s+/i, '')
  if (!token) {
    const cookie = request.headers?.get?.('cookie') ?? ''
    const m = cookie.match(/(?:^|;)\s*token=([^;]+)/)
    if (m)
      token = decodeURIComponent(m[1])
  }
  if (!token)
    return null
  try {
    return await Auth.getUserFromToken(token)
  }
  catch {
    return null
  }
}

/** True when `user` owns the project the issue belongs to. */
async function ownsIssue(user: any, issueId: string): Promise<boolean> {
  const row = (await db.unsafe(
    `SELECT 1 FROM issues i JOIN projects p ON p.id = i.project_id
     WHERE i.id = $1 AND p.owner_id = $2 LIMIT 1`,
    [issueId, Number(user.id)],
  ))?.[0]
  return !!row
}

/** True when `user` owns the project. */
async function ownsProject(user: any, projectId: string): Promise<boolean> {
  const row = (await db.unsafe(
    'SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2 LIMIT 1',
    [projectId, Number(user.id)],
  ))?.[0]
  return !!row
}

// ---------------------------------------------------------------------------
// Ingest
// ---------------------------------------------------------------------------

route.options('/errors', () => new Response(null, { status: 204, headers: CORS }))

route.post('/errors', async (request: any) => {
  const body = request.jsonBody ?? {}
  const projectId = body.project ?? body.p
  if (!projectId || !body.message)
    return json({ error: 'missing project or message' }, 400)

  // Authorize: the report must present the project's ingest key.
  const providedKey = request.headers?.get('x-bughq-key') ?? body.key ?? null
  const project = (await db.unsafe(
    'SELECT id, ingest_key, is_active FROM projects WHERE id = $1 LIMIT 1',
    [String(projectId)],
  ))?.[0]
  const auth = authorizeIngest(project, providedKey)
  if (!auth.ok)
    return json({ error: auth.error }, auth.status)

  const now = new Date().toISOString()
  const errorType = body.type ?? body.error_type ?? 'Error'
  const message = String(body.message)
  const stack = body.stack ? String(body.stack) : undefined
  const fp = fingerprint(errorType, message, stack)

  // Roll the occurrence into its Issue: bump an existing group (reopening it if
  // it was resolved — a regression), or open a new one. Reads go through
  // db.unsafe (parameterized) so they're schema-independent and skip the global
  // soft-delete filter these tables don't participate in.
  const existing = (await db.unsafe(
    'SELECT id, count FROM issues WHERE project_id = $1 AND fingerprint = $2 LIMIT 1',
    [String(projectId), fp],
  ))?.[0]

  let issueId: string
  if (existing) {
    issueId = existing.id
    await db.unsafe(
      'UPDATE issues SET count = $1, last_seen = $2, status = $3 WHERE id = $4',
      [Number(existing.count ?? 0) + 1, now, 'unresolved', issueId],
    )
  }
  else {
    issueId = randomId()
    await db.insertInto('issues').values({
      id: issueId,
      project_id: String(projectId),
      fingerprint: fp,
      title: issueTitle(errorType, message),
      culprit: culprit(stack),
      error_type: errorType,
      level: body.level ?? 'error',
      status: 'unresolved',
      count: 1,
      users_affected: 0,
      first_seen: now,
      last_seen: now,
    }).execute()
  }

  await db.insertInto('error_events').values({
    id: randomId(),
    project_id: String(projectId),
    issue_id: issueId,
    message,
    stack: stack ?? null,
    error_type: errorType,
    category: categorize(errorType, message),
    severity: body.level ?? 'error',
    fingerprint: fp,
    url: body.url ?? null,
    browser: body.browser ?? null,
    os: body.os ?? null,
    user_agent: request.headers?.get('user-agent') ?? null,
    framework: body.framework ?? null,
    release: body.release ?? null,
    environment: body.environment ?? 'production',
    user_context: body.user ? JSON.stringify(body.user) : null,
    metadata: body.extra ? JSON.stringify(body.extra) : null,
    timestamp: now,
  }).execute()

  return json({ ok: true, issue: issueId }, 201)
}).skipCsrf() // public ingest: SDKs POST cross-origin with no CSRF cookie

// ---------------------------------------------------------------------------
// Issues API (dashboard)
// ---------------------------------------------------------------------------

route.get('/api/projects/{projectId}/issues', async (request: any) => {
  const projectId = request.params.projectId
  const user = await userFromRequest(request)
  if (!user)
    return json({ error: 'unauthorized' }, 401)
  if (!(await ownsProject(user, projectId)))
    return json({ error: 'not found' }, 404)
  const status = request.query?.status
  const cols = 'id, title, culprit, error_type, level, status, count, first_seen, last_seen'
  const issues = status
    ? await db.unsafe(
        `SELECT ${cols} FROM issues WHERE project_id = $1 AND status = $2 ORDER BY last_seen DESC LIMIT 100`,
        [projectId, status],
      )
    : await db.unsafe(
        `SELECT ${cols} FROM issues WHERE project_id = $1 ORDER BY last_seen DESC LIMIT 100`,
        [projectId],
      )
  return json({ issues: issues ?? [] })
})

route.get('/api/issues/{issueId}', async (request: any) => {
  const issueId = request.params.issueId
  const user = await userFromRequest(request)
  if (!user)
    return json({ error: 'unauthorized' }, 401)
  if (!(await ownsIssue(user, issueId)))
    return json({ error: 'not found' }, 404)
  const issue = (await db.unsafe('SELECT * FROM issues WHERE id = $1 LIMIT 1', [issueId]))?.[0]
  if (!issue)
    return json({ error: 'not found' }, 404)
  const events = await db.unsafe(
    'SELECT * FROM error_events WHERE issue_id = $1 ORDER BY timestamp DESC LIMIT 25',
    [issueId],
  )
  return json({ issue, events: events ?? [] })
})

route.post('/api/issues/{issueId}/resolve', async (request: any) => {
  const issueId = request.params.issueId
  const user = await userFromRequest(request)
  if (!user)
    return json({ error: 'unauthorized' }, 401)
  if (!(await ownsIssue(user, issueId)))
    return json({ error: 'not found' }, 404)
  const status = request.jsonBody?.status ?? 'resolved'
  await db.unsafe('UPDATE issues SET status = $1 WHERE id = $2', [status, issueId])
  return json({ ok: true, status })
}).skipCsrf()

// Form-friendly status change used by the issue detail page's Resolve/Ignore/
// Reopen buttons. Plain HTML form POST (no JS) -> 302 back to the issue, so the
// page reflects the new status on reload.
const ISSUE_STATUSES = new Set(['unresolved', 'resolved', 'ignored'])

route.post('/issue/{issueId}/status', async (request: any) => {
  const issueId = request.params.issueId
  const to = request.query?.to ?? request.jsonBody?.to ?? 'resolved'
  if (!ISSUE_STATUSES.has(to))
    return json({ error: 'invalid status' }, 400)
  const user = await userFromRequest(request)
  if (!user)
    return json({ error: 'unauthorized' }, 401)
  if (!(await ownsIssue(user, issueId)))
    return json({ error: 'not found' }, 404)
  await db.unsafe('UPDATE issues SET status = $1 WHERE id = $2', [to, issueId])
  return new Response(null, {
    status: 302,
    headers: { Location: `/issue/${encodeURIComponent(issueId)}`, ...CORS },
  })
}).skipCsrf() // plain HTML form POST from the issue page (no CSRF cookie)

// ---------------------------------------------------------------------------
// SDK + health
// ---------------------------------------------------------------------------

route.get('/sdk.js', (request: any) => {
  const origin = new URL(request.url).origin
  const script = `(function(){
  var s=document.currentScript,project=s&&s.getAttribute('data-project'),key=s&&s.getAttribute('data-key');
  if(!project||!key)return;
  function report(err,extra){try{
    var e=err&&err.error?err.error:err;
    fetch('${origin}/errors',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json','X-BugHQ-Key':key},
      body:JSON.stringify({project:project,type:(e&&e.name)||'Error',message:(e&&e.message)||String(e),
        stack:e&&e.stack,url:location.href,extra:extra||null})});
  }catch(_){}}
  window.addEventListener('error',function(ev){report(ev)});
  window.addEventListener('unhandledrejection',function(ev){report(ev.reason||ev)});
  window.bughq={capture:function(err,extra){report(err,extra)}};
})();`
  return new Response(script, {
    headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=3600', ...CORS },
  })
})

route.get('/health', () => response.json({ status: 'ok', app: 'bughq' }))
