import type { RequestInstance } from '@stacksjs/types'
import { Action } from '@stacksjs/actions'
import { services } from '@stacksjs/config'
import { Payment } from '@stacksjs/payments'
import { response } from '@stacksjs/router'

/**
 * Stripe webhook receiver. Verifies the signature against
 * services.stripe.webhookSecret, then lets @stacksjs/payments dispatch the
 * event to the subscription handlers registered below so the local
 * `subscriptions` table tracks Stripe. CSRF-exempt (third-party callback).
 */

// Register once at module load — keeps the local subscription state in sync
// when Stripe reports lifecycle changes (upgrade, cancel, payment failure).
Payment.onSubscription({
  created: async () => { /* manageSubscription.create already persisted the row on checkout */ },
  updated: async () => { /* provider_status / price synced by the payments core */ },
  deleted: async () => { /* row marked canceled by the payments core */ },
})

export default new Action({
  name: 'StripeWebhook',
  description: 'Handle Stripe webhook events',
  method: 'POST',
  async handle(request: RequestInstance) {
    const raw = (await (request as any).rawBody?.()) ?? ''
    const sig = (request as any).headers?.get?.('stripe-signature') ?? ''
    const secret = services?.stripe?.webhookSecret
    if (!secret)
      return response.json({ error: 'Webhook secret not configured' }, 400)
    try {
      await Payment.processWebhook(raw, sig, { secret })
      return response.json({ received: true })
    }
    catch {
      return response.json({ error: 'Invalid signature' }, 400)
    }
  },
})
