/**
 * @bughq/stx — bughq error tracking for Stacks / stx apps.
 *
 * - Server capture: `import { init, captureException } from '@bughq/stx'`
 *   (re-exported from ./server) — captures Bun/server errors.
 * - Client capture: drop the tracking snippet into your layout. Use
 *   `clientSnippet()` to render it from an stx `<script server>` block, or copy
 *   the `resources/BugHQ.stx` partial shipped with this package.
 */
export * from './server'
export { default } from './server'

export interface SnippetOptions {
  project: string
  key: string
  /** bughq host that serves /sdk.js. Default `https://bughq.org`. */
  host?: string
}

/**
 * Build the client `<script>` tag that loads bughq's browser autoloader for a
 * project. Render it raw in an stx layout, e.g.:
 *
 * ```stx
 * <script server>
 * import { clientSnippet } from '@bughq/stx'
 * const bughqTag = clientSnippet({ project: 'acme-web', key: 'pk_...' })
 * </script>
 * {!! bughqTag !!}
 * ```
 */
export function clientSnippet(options: SnippetOptions): string {
  const host = (options.host ?? 'https://bughq.org').replace(/\/+$/, '')
  return `<script src="${host}/sdk.js" data-project="${options.project}" data-key="${options.key}"></script>`
}
