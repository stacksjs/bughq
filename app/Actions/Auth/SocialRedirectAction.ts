import type { RequestInstance } from '@stacksjs/types'
import { createHmac } from 'node:crypto'
import { Action } from '@stacksjs/actions'
import { config } from '@stacksjs/config'
import { response } from '@stacksjs/router'
import { GitHubProvider, GoogleProvider } from '@stacksjs/socials'

/**
 * Begin an OAuth sign-in with a social provider (GitHub or Google) using the
 * native @stacksjs/socials drivers. The provider credentials come from
 * config.services.{github,google} (env-driven). We hand the driver a signed,
 * time-bounded `state` value so the callback can reject forged requests
 * without needing server-side session storage (this app uses token auth).
 */
function makeDriver(provider: string): GitHubProvider | GoogleProvider | null {
  const svc = config.services as any
  if (provider === 'github')
    return new GitHubProvider({ clientId: svc.github?.clientId ?? '', clientSecret: svc.github?.clientSecret ?? '', redirectUrl: svc.github?.redirectUrl ?? '' })
  if (provider === 'google')
    return new GoogleProvider({ clientId: svc.google?.clientId ?? '', clientSecret: svc.google?.clientSecret ?? '', redirectUrl: svc.google?.redirectUrl ?? '' })
  return null
}

export function signState(): string {
  const secret = String((config.app as any)?.key || process.env.APP_KEY || 'stacks-oauth')
  const ts = Date.now().toString()
  const sig = createHmac('sha256', secret).update(ts).digest('hex').slice(0, 32)
  return `${ts}.${sig}`
}

export default new Action({
  name: 'SocialRedirectAction',
  description: 'Redirect to a social provider for OAuth sign-in',
  method: 'GET',
  async handle(request: RequestInstance) {
    const provider = String((request as any).getParam?.('provider') ?? (request as any).params?.provider ?? '')
    const svc = config.services as any
    const driver = makeDriver(provider)
    if (!driver)
      return response.json({ error: 'Unknown provider' }, 404)
    if (!svc?.[provider]?.clientId)
      return response.json({ error: `${provider} sign-in is not configured yet.` }, 503)

    const url = await driver.withState(signState()).getAuthUrl()
    return new Response(null, { status: 302, headers: { Location: url } })
  },
})
