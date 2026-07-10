/**
 * @bughq/sdk — the core bughq error-tracking client.
 *
 * Framework-agnostic and SSR-safe. Captures uncaught errors + unhandled
 * rejections in the browser (and works as a manual client in Node/Bun), then
 * POSTs each event to the bughq ingest endpoint. The `@bughq/vue`,
 * `@bughq/nuxt`, and `@bughq/stx` packages build framework-aware capture on top
 * of this.
 *
 * Ingest contract: `POST {host}/errors`, header `X-BugHQ-Key: <ingest_key>`,
 * JSON body `{ project, type, message, stack, url, level, browser, os,
 * framework, release, environment, user, extra }`. The ingest key is public
 * (it ships in client code) — it is a revocable identifier, not a secret.
 */

export type Level = 'fatal' | 'error' | 'warning' | 'info'

export interface BugHQUser {
  id?: string | number
  email?: string
  username?: string
  [key: string]: unknown
}

/** The event payload POSTed to `/errors` (matches the ingest contract). */
export interface BugHQEvent {
  project: string
  type: string
  message: string
  stack?: string
  level: Level
  url?: string
  browser?: string
  os?: string
  framework?: string
  release?: string
  environment: string
  user?: BugHQUser | null
  extra?: Record<string, unknown> | null
}

export interface BugHQConfig {
  /** Project id (from your bughq dashboard). Or provide `dsn`. */
  project?: string
  /** Public ingest key. Or provide `dsn`. */
  key?: string
  /** Ingest host. Default `https://bughq.org`. */
  host?: string
  /** A DSN encoding host+key+project: `https://<key>@<host>/<project>`. */
  dsn?: string
  /** Release/version tag attached to every event. */
  release?: string
  /** Environment name. Default `production`. */
  environment?: string
  /** Framework tag (set automatically by the framework plugins). */
  framework?: string
  /** Set false to disable capture entirely (e.g. in dev). Default true. */
  enabled?: boolean
  /** Fraction of events to send, 0..1. Default 1. */
  sampleRate?: number
  /** Drop repeats of the same error within this window (ms). Default 5000. */
  dedupeMs?: number
  /** Explicit User-Agent header (server-side clients; browsers set it). */
  userAgent?: string
  /** Log SDK diagnostics to the console. */
  debug?: boolean
  /** Inspect/mutate an event before send; return null to drop it. */
  beforeSend?: (event: BugHQEvent) => BugHQEvent | null | void
}

const DEFAULT_HOST = 'https://bughq.org'

interface Resolved {
  project: string
  key: string
  host: string
  release?: string
  environment: string
  framework?: string
  enabled: boolean
  sampleRate: number
  dedupeMs: number
  userAgent?: string
  debug: boolean
  beforeSend?: (event: BugHQEvent) => BugHQEvent | null | void
}

/** Parse a DSN of the form `https://<key>@<host>/<project>`. */
export function parseDsn(dsn: string): { host: string, key: string, project: string } | null {
  try {
    const u = new URL(dsn)
    const key = u.username || u.password || ''
    const project = u.pathname.replace(/^\/+/, '').split('/')[0] || ''
    if (!project)
      return null
    return { host: `${u.protocol}//${u.host}`, key, project }
  }
  catch {
    return null
  }
}

function resolveConfig(config: BugHQConfig): Resolved {
  let project = config.project
  let key = config.key
  let host = config.host
  if (config.dsn) {
    const d = parseDsn(config.dsn)
    if (d) {
      host = host ?? d.host
      key = key ?? d.key
      project = project ?? d.project
    }
  }
  return {
    project: project ?? '',
    key: key ?? '',
    host: (host ?? DEFAULT_HOST).replace(/\/+$/, ''),
    release: config.release,
    environment: config.environment ?? 'production',
    framework: config.framework,
    enabled: config.enabled !== false,
    sampleRate: config.sampleRate ?? 1,
    dedupeMs: config.dedupeMs ?? 5000,
    userAgent: config.userAgent,
    debug: !!config.debug,
    beforeSend: config.beforeSend,
  }
}

/** Best-effort browser + OS from a UA string (bughq groups on type/message). */
export function parseUserAgent(ua: string): { browser?: string, os?: string } {
  if (!ua)
    return {}
  let browser: string | undefined
  const browsers: Array<[RegExp, string]> = [
    [/Edg\/(\d+)/, 'Edge'],
    [/OPR\/(\d+)/, 'Opera'],
    [/Firefox\/(\d+)/, 'Firefox'],
    [/Chrome\/(\d+)/, 'Chrome'],
    [/Version\/(\d+)[^S]*Safari/, 'Safari'],
  ]
  for (const [re, name] of browsers) {
    const m = ua.match(re)
    if (m) {
      browser = `${name} ${m[1]}`
      break
    }
  }
  let os: string | undefined
  if (/Windows NT 10/.test(ua))
    os = 'Windows 10'
  else if (/Windows/.test(ua))
    os = 'Windows'
  else if (/Mac OS X/.test(ua))
    os = 'macOS'
  else if (/Android/.test(ua))
    os = 'Android'
  else if (/iPhone|iPad|iPod|iOS/.test(ua))
    os = 'iOS'
  else if (/Linux/.test(ua))
    os = 'Linux'
  return { browser, os }
}

function errorType(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { name?: unknown, constructor?: { name?: unknown } }
    if (e.name)
      return String(e.name)
    if (e.constructor && e.constructor.name)
      return String(e.constructor.name)
  }
  return 'Error'
}

function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err)
    return String((err as { message: unknown }).message)
  return String(err)
}

function errorStack(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'stack' in err && (err as { stack?: unknown }).stack)
    return String((err as { stack: unknown }).stack)
  return undefined
}

// --- SSR-safe global accessors (never throw when window/navigator absent) ---
function root(): any {
  return typeof globalThis !== 'undefined' ? (globalThis as any) : {}
}
function safeWindow(): any {
  const g = root()
  return g.window && typeof g.window.addEventListener === 'function' ? g.window : null
}
function safeUA(): string {
  const g = root()
  return g.navigator && g.navigator.userAgent ? String(g.navigator.userAgent) : ''
}
function safeUrl(): string | undefined {
  const g = root()
  return g.location && g.location.href ? String(g.location.href) : undefined
}
function safeFetch(): typeof fetch | null {
  const g = root()
  return typeof g.fetch === 'function' ? g.fetch.bind(g) : null
}

export class BugHQClient {
  readonly config: Resolved
  private user: BugHQUser | null = null
  private context: Record<string, unknown> = {}
  private lastSeen = new Map<string, number>()
  private detach: Array<() => void> = []

  constructor(config: BugHQConfig) {
    this.config = resolveConfig(config)
    if (!this.config.project || !this.config.key) {
      if (this.config.debug)
        console.warn('[bughq] missing project or key — capture disabled')
      this.config.enabled = false
    }
    if (this.config.enabled)
      this.installGlobalHandlers()
  }

  setUser(user: BugHQUser | null): void {
    this.user = user
  }

  setContext(ctx: Record<string, unknown>): void {
    this.context = { ...this.context, ...ctx }
  }

  setRelease(release: string): void {
    this.config.release = release
  }

  setEnvironment(environment: string): void {
    this.config.environment = environment
  }

  captureMessage(message: string, level: Level = 'info', extra?: Record<string, unknown>): void {
    this.dispatch({ type: 'Message', message, level }, extra)
  }

  captureException(err: unknown, extra?: Record<string, unknown>): void {
    this.dispatch({ type: errorType(err), message: errorMessage(err), stack: errorStack(err), level: 'error' }, extra)
  }

  private dispatch(base: { type: string, message: string, stack?: string, level: Level }, extra?: Record<string, unknown>): void {
    if (!this.config.enabled)
      return
    if (this.config.sampleRate < 1 && Math.random() > this.config.sampleRate)
      return

    const dedupeKey = `${base.type}|${base.message}|${(base.stack || '').split('\n')[1] || ''}`
    const now = Date.now()
    const seen = this.lastSeen.get(dedupeKey)
    if (seen && now - seen < this.config.dedupeMs)
      return
    this.lastSeen.set(dedupeKey, now)

    const { browser, os } = parseUserAgent(safeUA())
    const mergedExtra = { ...this.context, ...(extra || {}) }
    let event: BugHQEvent = {
      project: this.config.project,
      type: base.type,
      message: base.message,
      stack: base.stack,
      level: base.level,
      url: safeUrl(),
      browser,
      os,
      framework: this.config.framework,
      release: this.config.release,
      environment: this.config.environment,
      user: this.user,
      extra: Object.keys(mergedExtra).length ? mergedExtra : null,
    }

    if (this.config.beforeSend) {
      const result = this.config.beforeSend(event)
      if (result === null)
        return
      if (result)
        event = result
    }

    this.send(event)
  }

  private send(event: BugHQEvent): void {
    const doFetch = safeFetch()
    if (!doFetch) {
      if (this.config.debug)
        console.warn('[bughq] no fetch available — event dropped', event)
      return
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-BugHQ-Key': this.config.key,
    }
    // Browsers forbid setting User-Agent (silently dropped); Node/Bun honor it,
    // and the server reads UA from this header for server-side clients.
    if (this.config.userAgent)
      headers['User-Agent'] = this.config.userAgent
    try {
      doFetch(`${this.config.host}/errors`, {
        method: 'POST',
        keepalive: true,
        headers,
        body: JSON.stringify(event),
      }).then(
        (r: any) => {
          if (this.config.debug)
            console.info('[bughq] sent', event.type, r && r.status)
        },
        () => {},
      )
    }
    catch {
      // never let reporting throw
    }
  }

  private installGlobalHandlers(): void {
    const w = safeWindow()
    if (!w)
      return
    const onError = (ev: any) => this.captureException(ev && ev.error ? ev.error : ev)
    const onRejection = (ev: any) => this.captureException(ev && ev.reason ? ev.reason : ev)
    w.addEventListener('error', onError)
    w.addEventListener('unhandledrejection', onRejection)
    this.detach.push(() => {
      w.removeEventListener('error', onError)
      w.removeEventListener('unhandledrejection', onRejection)
    })
  }

  /** Remove installed handlers. */
  close(): void {
    this.detach.forEach(fn => fn())
    this.detach = []
  }
}

let defaultClient: BugHQClient | null = null

/** Initialize the default client (installs global handlers in the browser). */
export function init(config: BugHQConfig): BugHQClient {
  defaultClient = new BugHQClient(config)
  return defaultClient
}

export function getClient(): BugHQClient | null {
  return defaultClient
}

export function captureException(err: unknown, extra?: Record<string, unknown>): void {
  defaultClient?.captureException(err, extra)
}

export function captureMessage(message: string, level?: Level, extra?: Record<string, unknown>): void {
  defaultClient?.captureMessage(message, level, extra)
}

export function setUser(user: BugHQUser | null): void {
  defaultClient?.setUser(user)
}

export function setContext(ctx: Record<string, unknown>): void {
  defaultClient?.setContext(ctx)
}

export function close(): void {
  defaultClient?.close()
  defaultClient = null
}

/** The `bughq` object the marketing page advertises: `bughq.init({ dsn })`. */
export const bughq = { init, captureException, captureMessage, setUser, setContext, close, getClient }
export default bughq
