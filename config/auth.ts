import type { AuthConfig } from '@stacksjs/types'
import { env } from '@stacksjs/env'

/**
 * **Authentication Configuration**
 *
 * This configuration defines all of your authentication options. Because Stacks is fully-typed,
 * you may hover any of the options below and the definitions will be provided. In case
 * you have any questions, feel free to reach out via Discord or GitHub Discussions.
 */
export default {
  enabled: true,

  /**
   * The authentication guard to use for your application.
   */
  default: 'api',

  /**
   * The authentication guards available for your application.
   */
  guards: {
    api: {
      driver: 'token',
      provider: 'users',
    },
  },

  /**
   * The authentication providers available for your application.
   */
  providers: {
    users: {
      driver: 'database',
      table: 'users',
    },
  },

  /**
   * The username field used for authentication.
   */
  username: env.AUTH_USERNAME_FIELD || 'email',

  /**
   * The password field used for authentication.
   */
  password: env.AUTH_PASSWORD_FIELD || 'password',

  /**
   * Access-token expiry in milliseconds (default: 1 hour).
   *
   * Access tokens are deliberately short-lived: a leaked bearer (logs,
   * proxy, browser storage) is then usable for an hour, not a month. The
   * paired refresh token (`refreshTokenExpiry`) carries the long-lived
   * session and is rotated on use, so UX is unaffected.
   */
  // 30 days: the dashboard is a long-lived session (token kept in localStorage +
  // a cookie). A 1h expiry logged users out mid-session.
  tokenExpiry: env.AUTH_TOKEN_EXPIRY || 30 * 24 * 60 * 60 * 1000,

  /**
   * Refresh-token expiry in milliseconds (default: 30 days). This is the
   * long-lived credential exchanged for fresh access tokens.
   */
  refreshTokenExpiry: env.AUTH_REFRESH_TOKEN_EXPIRY || 30 * 24 * 60 * 60 * 1000,

  /**
   * The token rotation time in hours (default: 24 hours).
   */
  tokenRotation: env.AUTH_TOKEN_ROTATION || 24,

  /**
   * The token abilities that are granted by default.
   */
  defaultAbilities: ['*'],

  /**
   * The token name used when creating new tokens.
   */
  defaultTokenName: 'auth-token',

  /**
   * Password reset configuration.
   */
  passwordReset: {
    /**
     * Where the emailed reset link points. `{token}` and `{email}` are
     * filled in by the framework's password-reset sender.
     *
     * TEMPORARY: absolute local URL for the local-dev phase; switch to the
     * path template '/reset-password?token={token}&email={email}' at launch
     * so it resolves against the deployed app URL.
     */
    url: env.AUTH_PASSWORD_RESET_URL || 'http://localhost:3100/reset-password?token={token}&email={email}',

    /**
     * Token expiration time in minutes.
     * After this time, the reset link becomes invalid.
     *
     * @default 60
     */
    expire: env.AUTH_PASSWORD_RESET_EXPIRE ||60,

    /**
     * Throttle time in seconds between password reset requests.
     * Users must wait this long before requesting another reset email.
     *
     * @default 60
     */
    throttle: env.AUTH_PASSWORD_RESET_THROTTLE ||60,
  },
} satisfies AuthConfig
