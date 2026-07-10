import type { BugHQConfig } from '@bughq/sdk'

/** True when there's enough config (project + key/dsn) to report. */
export function bughqEnabled(config: Partial<BugHQConfig> | null | undefined): boolean {
  return !!(config && config.project && (config.key || config.dsn))
}
