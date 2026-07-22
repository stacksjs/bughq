import { describe, expect, test } from 'bun:test'
import { parseRepository } from '../../app/Autofix/github'
import { isAnalysis, isProposedFix, selectRequestedFiles } from '../../app/Autofix/workflow'

describe('Autofix repository safety', () => {
  test('normalizes supported GitHub repository forms', () => {
    expect(parseRepository('stacksjs/bughq')).toEqual({ owner: 'stacksjs', repo: 'bughq' })
    expect(parseRepository('https://github.com/stacksjs/bughq.git')).toEqual({ owner: 'stacksjs', repo: 'bughq' })
    expect(parseRepository('git@github.com:stacksjs/bughq.git')).toEqual({ owner: 'stacksjs', repo: 'bughq' })
  })

  test('rejects traversal and non-GitHub repository shapes', () => {
    expect(() => parseRepository('../secret')).toThrow()
    expect(() => parseRepository('github.com/owner/repo/extra')).toThrow()
  })

  test('allows only existing source paths requested by the model', () => {
    const available = ['src/auth/login.ts', 'src/auth/session.ts', 'tests/auth.test.ts']
    expect(selectRequestedFiles(
      ['../../.env', 'src/auth/login.ts', 'missing.ts'],
      available,
      '',
      5,
    )).toEqual(['src/auth/login.ts'])
  })

  test('uses an unambiguous stack basename as a fallback', () => {
    expect(selectRequestedFiles([], ['src/controllers/login.ts', 'src/session.ts'], 'at login (login.ts:42:3)', 5))
      .toEqual(['src/controllers/login.ts'])
  })
})

describe('Autofix AI output guards', () => {
  test('accepts a complete analysis and rejects partial objects', () => {
    expect(isAnalysis({
      rootCause: 'The nullable value is dereferenced.',
      confidence: 'high',
      plan: [{ title: 'Guard input', detail: 'Return before dereferencing null.' }],
      requestedFiles: ['src/a.ts'],
      tests: ['Run auth tests'],
    })).toBe(true)
    expect(isAnalysis({ rootCause: 'x' })).toBe(false)
  })

  test('requires complete replacement files in a proposed fix', () => {
    expect(isProposedFix({
      summary: 'Guard the nullable input.',
      prTitle: 'fix: guard nullable input',
      prBody: 'Adds a focused guard.',
      files: [{ path: 'src/a.ts', content: 'export {}\n', explanation: 'Prevents the dereference.' }],
      tests: ['Run unit tests'],
      risks: [],
    })).toBe(true)
    expect(isProposedFix({ summary: 'x', files: [] })).toBe(false)
  })
})
