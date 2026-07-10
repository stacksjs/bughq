/**
 * @bughq/stx server SDK — capture server-side (Bun/Node) errors from a Stacks
 * app and report them to bughq. Wraps @bughq/sdk's client (which works outside
 * the browser too) and adds `process` handlers as a zero-config safety net.
 *
 * Primary use is calling `captureException(err)` from your error pipeline
 * (e.g. `config/errors.ts` or a try/catch); the process handlers catch what
 * slips through.
 */
import type { BugHQConfig, BugHQUser, Level } from '@bughq/sdk'
import { BugHQClient } from '@bughq/sdk'

export type { BugHQConfig, BugHQUser, Level }

export interface ServerConfig extends BugHQConfig {
  /** Install process handlers for uncaughtException/unhandledRejection. Default true. */
  captureUnhandled?: boolean
}

let client: BugHQClient | null = null
let detach: (() => void) | null = null

/** Initialize server-side capture. Call once at app boot. */
export function init(config: ServerConfig): BugHQClient {
  detach?.()
  client = new BugHQClient({
    ...config,
    framework: config.framework ?? 'stacks',
    userAgent: config.userAgent ?? '@bughq/stx (+server; Bun)',
  })

  if (config.captureUnhandled !== false && typeof process !== 'undefined' && process.on) {
    const onException = (err: unknown) => {
      // Report best-effort and keep the error visible; we do not force-exit so
      // the fire-and-forget report can flush and other handlers still run.
      client?.captureException(err, { fatal: true })
      console.error(err)
    }
    const onRejection = (reason: unknown) => {
      client?.captureException(reason, { unhandledRejection: true })
    }
    process.on('uncaughtException', onException)
    process.on('unhandledRejection', onRejection)
    detach = () => {
      process.off('uncaughtException', onException)
      process.off('unhandledRejection', onRejection)
    }
  }
  return client
}

export function captureException(err: unknown, extra?: Record<string, unknown>): void {
  client?.captureException(err, extra)
}

export function captureMessage(message: string, level?: Level, extra?: Record<string, unknown>): void {
  client?.captureMessage(message, level, extra)
}

export function setUser(user: BugHQUser | null): void {
  client?.setUser(user)
}

export function getClient(): BugHQClient | null {
  return client
}

export function close(): void {
  detach?.()
  detach = null
  client?.close()
  client = null
}

export const bughq = { init, captureException, captureMessage, setUser, getClient, close }
export default bughq
