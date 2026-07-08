/**
 * Ingest authorization for bughq.
 *
 * Error reports arrive from untrusted clients (the browser/server SDK), so the
 * ingest endpoint must tie every report to a known, active project that
 * presents that project's `ingest_key`. The key is public (it ships in client
 * code) - it is an identifier that is revocable and rotatable, not a secret.
 *
 * The policy is kept as a pure function so it can be unit-tested without a
 * database or a running server; the route does the IO (project lookup) and
 * delegates the decision here.
 */

export interface IngestProject {
  id: string
  ingest_key: string | null
  is_active: boolean | null
}

export type IngestAuth =
  | { ok: true }
  | { ok: false, status: number, error: string }

/**
 * Decide whether an ingest request is allowed.
 *
 * @param project the project row looked up by id (undefined if none matched)
 * @param providedKey the `X-BugHQ-Key` header (or body `key`) from the request
 */
export function authorizeIngest(
  project: IngestProject | undefined | null,
  providedKey: string | null | undefined,
): IngestAuth {
  if (!project)
    return { ok: false, status: 404, error: 'unknown project' }
  if (project.is_active === false)
    return { ok: false, status: 403, error: 'project inactive' }
  if (!project.ingest_key)
    return { ok: false, status: 403, error: 'project has no ingest key' }
  if (!providedKey || providedKey !== project.ingest_key)
    return { ok: false, status: 401, error: 'invalid ingest key' }
  return { ok: true }
}
