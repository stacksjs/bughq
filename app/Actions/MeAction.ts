import type { RequestInstance } from '@stacksjs/types'
import { Action } from '@stacksjs/actions'
import { Auth } from '@stacksjs/auth'
import { Payment } from '@stacksjs/payments'
import { response } from '@stacksjs/router'

/**
 * Return the authenticated user plus their Pro status. The dashboard calls this
 * to gate Pro features and reflect the plan after a successful checkout. Pro is
 * true when a local `subscriptions` row for this user (type 'default') is
 * active/trialing — kept in sync by the Stripe webhook.
 */
export default new Action({
  name: 'MeAction',
  description: 'Return the current user and their Pro status',
  method: 'GET',
  async handle(request: RequestInstance) {
    const authHeader = ((request as any).headers?.get?.('authorization') ?? '')
    const bearer = (request as any).bearerToken?.() ?? authHeader.replace(/^Bearer\s+/i, '')
    const user = bearer ? await Auth.getUserFromToken(bearer) : await request.user()
    if (!user)
      return response.unauthorized('Authentication required')

    let pro = false
    try {
      pro = await Payment.hasActiveSubscription(user as any, 'default')
    }
    catch {
      pro = false
    }

    return response.json({
      user: { id: (user as any).id, name: (user as any).name, email: (user as any).email },
      pro,
    })
  },
})
