import { expect, test } from 'bun:test'
import { bughqEnabled } from '../src/shared'

test('bughqEnabled requires project + (key or dsn)', () => {
  expect(bughqEnabled({ project: 'p', key: 'k' })).toBe(true)
  expect(bughqEnabled({ project: 'p', dsn: 'https://k@bughq.org/p' })).toBe(true)
  expect(bughqEnabled({ project: 'p' })).toBe(false)
  expect(bughqEnabled({ key: 'k' })).toBe(false)
  expect(bughqEnabled({})).toBe(false)
  expect(bughqEnabled(null)).toBe(false)
  expect(bughqEnabled(undefined)).toBe(false)
})
