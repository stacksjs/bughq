/**
 * Error grouping + classification helpers for bughq.
 *
 * A fingerprint collapses many occurrences of "the same" error into one Issue.
 * We derive it from the error type + a normalized message + the top
 * application stack frame, so noise (ids, addresses, line/col drift) doesn't
 * split one bug into thousands of issues.
 */

import { createHash } from 'node:crypto'

/** Strip volatile tokens so equivalent messages fingerprint identically. */
export function normalizeMessage(message: string): string {
  return (message || '')
    .replace(/0x[0-9a-f]+/gi, '0xADDR') // pointers
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, 'UUID')
    .replace(/\b\d+\b/g, 'N') // ids, counts, line numbers
    .replace(/(['"]).*?\1/g, '$1…$1') // quoted literals
    .trim()
    .slice(0, 300)
}

/** The first stack frame that looks like application (not vendor) code. */
export function topFrame(stack: string | undefined): string {
  if (!stack)
    return ''
  const lines = stack.split('\n').map(l => l.trim()).filter(Boolean)
  const appFrame = lines.find(l => /\bat\b/.test(l) && !/node_modules|node:internal/.test(l))
  const frame = appFrame ?? lines[1] ?? ''
  // Drop the :line:col suffix so small drift doesn't change the fingerprint.
  return frame.replace(/:\d+:\d+\)?$/, '').replace(/0x[0-9a-f]+/gi, '')
}

/** Stable group key for an error. */
export function fingerprint(errorType: string, message: string, stack?: string): string {
  const basis = `${errorType || 'Error'}|${normalizeMessage(message)}|${topFrame(stack)}`
  return createHash('sha256').update(basis).digest('hex').slice(0, 32)
}

/** Human-friendly issue title: "TypeError: cannot read property …". */
export function issueTitle(errorType: string, message: string): string {
  const type = errorType || 'Error'
  const msg = (message || '').split('\n')[0].slice(0, 240)
  return msg ? `${type}: ${msg}` : type
}

/** Where the error came from — the top app frame, for the issue list. */
export function culprit(stack: string | undefined): string {
  const frame = topFrame(stack)
  const m = frame.match(/at\s+(.+)/)
  return (m?.[1] ?? frame).slice(0, 240)
}

const CATEGORY_RULES: Array<[RegExp, string]> = [
  [/TypeError|is not a function|cannot read propert/i, 'type'],
  [/ReferenceError|is not defined/i, 'reference'],
  [/SyntaxError|Unexpected token/i, 'syntax'],
  [/NetworkError|Failed to fetch|ERR_|timeout/i, 'network'],
  [/SecurityError|CORS|Content Security Policy/i, 'security'],
  [/RangeError|Maximum call stack/i, 'range'],
]

/** Coarse category used for filtering/grouping in the dashboard. */
export function categorize(errorType: string, message: string): string {
  const hay = `${errorType} ${message}`
  for (const [re, cat] of CATEGORY_RULES) {
    if (re.test(hay))
      return cat
  }
  return 'other'
}

/** A short, URL-safe id for event / issue primary keys. */
export function randomId(): string {
  return createHash('sha256').update(globalThis.crypto.randomUUID()).digest('hex').slice(0, 24)
}
