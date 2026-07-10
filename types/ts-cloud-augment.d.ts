/**
 * Type augmentations for @ts-cloud/core.
 *
 * These properties are read by the ts-cloud runtime but are missing from the
 * published `.d.ts` types, so `config/cloud.ts` fails `tsc --noEmit` even though
 * the config is valid at deploy time. Declaring them here keeps the deploy
 * config type-checked without editing it. Remove once the ts-cloud types ship
 * these fields upstream.
 */
declare module '@ts-cloud/core' {
  interface CloudProviderConfig {
    /** Attach to another project's shared box instead of provisioning one. */
    attachTo?: string
  }

  interface EnvironmentConfig {
    /** Git branch whose pushes deploy to this environment. */
    deployBranch?: string
    /** Subdomain prefix for this environment (e.g. `staging` -> staging.<domain>). */
    domainPrefix?: string
  }

  interface ComputeConfig {
    /** Managed database details for the box's Postgres/MySQL install. */
    database?: {
      engine?: string
      name?: string
      username?: string
      password?: string
    }
  }
}

export {}
