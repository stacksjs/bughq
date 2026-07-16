import type { AppConfig } from '@stacksjs/types'
import { env } from '@stacksjs/env'

/**
 * **Application Configuration**
 *
 * This configuration defines all of your application options. Because Stacks is fully-typed,
 * you may hover any of the options below and the definitions will be provided. In case
 * you have any questions, feel free to reach out via Discord or GitHub Discussions.
 */
export default {
  name: env.APP_NAME ?? 'Stacks',
  description: 'Stacks is a full-stack framework for building modern web applications.',
  env: env.APP_ENV ?? 'local',
  url: env.APP_URL ?? 'stacks.localhost',
  redirectUrls: ['stacksjs.com'],
  // Never expose stack traces in production, even if a stray DEBUG=true leaks
  // into the deployed env — the framework error page would otherwise render them.
  debug: String(env.DEBUG) === 'true' && (env.APP_ENV ?? 'local') !== 'production',
  key: env.APP_KEY,

  maintenanceMode: env.APP_MAINTENANCE ?? false,
  comingSoonMode: env.APP_COMING_SOON ?? false,
  comingSoonSecret: env.APP_COMING_SOON_SECRET ?? '',
  // docMode: true, // instead of example.com/docs, deploys example.com as main entry point for docs
  docMode: false,

  timezone: 'America/Los_Angeles',
  locale: 'en',
  fallbackLocale: 'en',
  cipher: 'aes-256-cbc',
} satisfies AppConfig
