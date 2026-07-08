import { describe, expect, test } from 'bun:test'
import { authorizeIngest } from '../../app/Errors/ingest'

const KEY = 'a3f19b7c4d2e8091ab12cd34ef56ab78'
const project = { id: 'demo', ingest_key: KEY, is_active: true }

describe('authorizeIngest', () => {
  test('allows a matching key on an active project', () => {
    expect(authorizeIngest(project, KEY)).toEqual({ ok: true })
  })

  test('rejects an unknown project with 404', () => {
    expect(authorizeIngest(undefined, KEY)).toEqual({ ok: false, status: 404, error: 'unknown project' })
    expect(authorizeIngest(null, KEY)).toEqual({ ok: false, status: 404, error: 'unknown project' })
  })

  test('rejects an inactive project with 403', () => {
    const res = authorizeIngest({ ...project, is_active: false }, KEY)
    expect(res).toEqual({ ok: false, status: 403, error: 'project inactive' })
  })

  test('rejects a project with no ingest key with 403', () => {
    const res = authorizeIngest({ ...project, ingest_key: null }, KEY)
    expect(res).toEqual({ ok: false, status: 403, error: 'project has no ingest key' })
  })

  test('rejects a wrong key with 401', () => {
    expect(authorizeIngest(project, 'wrong').status).toBe(401)
  })

  test('rejects a missing key with 401', () => {
    expect(authorizeIngest(project, null).status).toBe(401)
    expect(authorizeIngest(project, undefined).status).toBe(401)
    expect(authorizeIngest(project, '').status).toBe(401)
  })

  test('does not treat a null-key project as matching a null provided key', () => {
    // Guards against `null === null` slipping through: no key configured must
    // never authorize, even if the client also sends nothing.
    expect(authorizeIngest({ ...project, ingest_key: null }, null).ok).toBe(false)
  })
})
