import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import { captureException, clientSnippet, close, init } from '../src/index'

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
afterEach(() => { close(); restoreFetch() })

test('clientSnippet builds the tracking script tag', () => {
  expect(clientSnippet({ project: 'acme', key: 'pk_1', host: 'http://localhost:3108/' }))
    .toBe('<script src="http://localhost:3108/sdk.js" data-project="acme" data-key="pk_1"></script>')
})

test('server init + captureException POSTs with a User-Agent header', () => {
  init({ project: 'demo', key: 'k', host: 'http://localhost:3108', captureUnhandled: false, dedupeMs: 0 })
  captureException(new RangeError('server boom'))
  expect(calls).toHaveLength(1)
  const opts = calls[0].options
  expect(opts.headers['X-BugHQ-Key']).toBe('k')
  expect(opts.headers['User-Agent']).toContain('@bughq/stx')
  const body = JSON.parse(opts.body)
  expect(body.type).toBe('RangeError')
  expect(body.framework).toBe('stacks')
})

test('captureUnhandled:false does not add a process listener', () => {
  const before = process.listenerCount('unhandledRejection')
  init({ project: 'demo', key: 'k', host: 'http://x', captureUnhandled: false })
  expect(process.listenerCount('unhandledRejection')).toBe(before)
})

test('captureUnhandled (default) installs and close() removes handlers', () => {
  const before = process.listenerCount('unhandledRejection')
  init({ project: 'demo', key: 'k', host: 'http://x' })
  expect(process.listenerCount('unhandledRejection')).toBe(before + 1)
  close()
  expect(process.listenerCount('unhandledRejection')).toBe(before)
})
