import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import BugHQ, { createBugHQ } from '../src/index'

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

function fakeApp() {
  return {
    config: { errorHandler: undefined as any, globalProperties: {} as any },
    provide(_key: any, _val: any) {},
  }
}

test('install chains errorHandler and captures component errors', () => {
  const app = fakeApp()
  let previousCalled = false
  app.config.errorHandler = () => { previousCalled = true }

  ;(BugHQ as any).install(app, { project: 'demo', key: 'k', host: 'http://x', dedupeMs: 0 })

  app.config.errorHandler(new TypeError('vue boom'), { $options: { name: 'Widget' } }, 'render')

  expect(calls).toHaveLength(1)
  const body = JSON.parse(calls[0].options.body)
  expect(body.framework).toBe('vue')
  expect(body.type).toBe('TypeError')
  expect(body.extra.component).toBe('Widget')
  expect(body.extra.lifecycle).toBe('render')
  expect(previousCalled).toBe(true) // original handler preserved
})

test('createBugHQ returns an installable plugin and sets $bughq', () => {
  const app = fakeApp()
  ;(createBugHQ({ project: 'demo', key: 'k', host: 'http://x' }) as any).install(app)
  expect(typeof app.config.globalProperties.$bughq.captureException).toBe('function')
})

test('attachErrorHandler:false leaves the handler untouched', () => {
  const app = fakeApp()
  const original = () => {}
  app.config.errorHandler = original
  ;(BugHQ as any).install(app, { project: 'demo', key: 'k', host: 'http://x', attachErrorHandler: false })
  expect(app.config.errorHandler).toBe(original)
})
