import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { BugHQClient, init, parseDsn, parseUserAgent } from '../src/index'

// Capture outgoing requests by stubbing global fetch.
let calls: Array<{ url: string, options: any }>
let restoreFetch: () => void

beforeEach(() => {
  calls = []
  const original = (globalThis as any).fetch
  ;(globalThis as any).fetch = mock((url: string, options: any) => {
    calls.push({ url, options })
    return Promise.resolve({ status: 201 })
  })
  restoreFetch = () => { (globalThis as any).fetch = original }
})
afterEach(() => restoreFetch())

const cfg = { project: 'demo', key: 'k_123', host: 'http://localhost:3108', dedupeMs: 0 }

describe('parseDsn', () => {
  test('parses key@host/project', () => {
    expect(parseDsn('https://abc123@bughq.org/acme-web-9f2c')).toEqual({
      host: 'https://bughq.org',
      key: 'abc123',
      project: 'acme-web-9f2c',
    })
  })
  test('returns null without a project', () => {
    expect(parseDsn('https://abc@bughq.org/')).toBeNull()
    expect(parseDsn('not a url')).toBeNull()
  })
})

describe('parseUserAgent', () => {
  test('extracts Chrome on macOS', () => {
    const r = parseUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36')
    expect(r.browser).toBe('Chrome 126')
    expect(r.os).toBe('macOS')
  })
  test('empty ua -> {}', () => {
    expect(parseUserAgent('')).toEqual({})
  })
})

describe('BugHQClient', () => {
  test('captureException POSTs the correct contract', async () => {
    const c = new BugHQClient(cfg)
    c.captureException(new TypeError('boom at x'))
    await Promise.resolve()
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('http://localhost:3108/errors')
    expect(calls[0].options.method).toBe('POST')
    expect(calls[0].options.headers['X-BugHQ-Key']).toBe('k_123')
    const body = JSON.parse(calls[0].options.body)
    expect(body.project).toBe('demo')
    expect(body.type).toBe('TypeError')
    expect(body.message).toBe('boom at x')
    expect(body.level).toBe('error')
    expect(typeof body.stack).toBe('string')
  })

  test('dedupes the same error (same site) within the window', () => {
    const c = new BugHQClient({ ...cfg, dedupeMs: 10000 })
    const err = new Error('same') // one error → identical type|message|top-frame
    c.captureException(err)
    c.captureException(err)
    expect(calls).toHaveLength(1)
  })

  test('beforeSend can drop an event', () => {
    const c = new BugHQClient({ ...cfg, beforeSend: () => null })
    c.captureException(new Error('nope'))
    expect(calls).toHaveLength(0)
  })

  test('beforeSend can mutate an event', () => {
    const c = new BugHQClient({ ...cfg, beforeSend: (e) => ({ ...e, message: 'redacted' }) })
    c.captureException(new Error('secret'))
    expect(JSON.parse(calls[0].options.body).message).toBe('redacted')
  })

  test('missing project/key disables capture', () => {
    const c = new BugHQClient({ key: 'k' } as any)
    c.captureException(new Error('x'))
    expect(calls).toHaveLength(0)
  })

  test('sets framework/release/environment on the payload', () => {
    const c = new BugHQClient({ ...cfg, framework: 'vue', release: '1.2.3', environment: 'staging' })
    c.captureException(new Error('e'))
    const body = JSON.parse(calls[0].options.body)
    expect(body.framework).toBe('vue')
    expect(body.release).toBe('1.2.3')
    expect(body.environment).toBe('staging')
  })

  test('captureMessage sends a Message event with a level', () => {
    const c = new BugHQClient(cfg)
    c.captureMessage('hello', 'warning')
    const body = JSON.parse(calls[0].options.body)
    expect(body.type).toBe('Message')
    expect(body.message).toBe('hello')
    expect(body.level).toBe('warning')
  })

  test('init() returns a client and does not throw without a window', () => {
    expect(() => init(cfg)).not.toThrow()
  })
})
