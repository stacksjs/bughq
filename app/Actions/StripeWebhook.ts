import type { RequestInstance } from '@stacksjs/types'
import type Stripe from 'stripe'
import { Action } from '@stacksjs/actions'
import { services } from '@stacksjs/config'
import { db } from '@stacksjs/database'
import { Payment } from '@stacksjs/payments'
import { response } from '@stacksjs/router'

/**
 * Stripe webhook receiver. Verifies the signature against
 * services.stripe.webhookSecret using the EXACT raw request body
 * (`request.rawBody()`, added to the router in @stacksjs/bun-router 0.0.17) —
 * a re-serialized jsonBody would not match Stripe's HMAC. It then dispatches
 * the event to the handlers below so the local `subscriptions` table tracks
 * Stripe. CSRF-exempt (third-party callback).
 */

/**
 * Upsert the local subscription row from a Stripe subscription event so
 * `Payment.hasActiveSubscription(user, 'default')` reflects Pro access. The
 * subscription's `customer` maps back to the local user via `users.stripe_id`
 * (set during checkout).
 */
async function syncSubscription(event: Stripe.Event): Promise<void> {
  const sub = event.data.object as Stripe.Subscription
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
  if (!customerId)
    return

  const user = await db.selectFrom('users').where('stripe_id', '=', customerId).selectAll().executeTakeFirst()
  if (!user)
    return

  const item = sub.items?.data?.[0]
  const providerPriceId = item?.price?.id ?? ''
  const unitPrice = Number(item?.price?.unit_amount ?? 0)

  const existing = await db.selectFrom('subscriptions').where('provider_id', '=', sub.id).selectAll().executeTakeFirst()
  if (existing) {
    await db.updateTable('subscriptions')
      .set({ provider_status: sub.status, provider_price_id: providerPriceId, unit_price: unitPrice })
      .where('provider_id', '=', sub.id)
      .execute()
    return
  }

  await db.insertInto('subscriptions')
    .values({
      user_id: (user as { id: number }).id,
      type: 'default',
      plan: 'pro',
      provider_id: sub.id,
      provider_status: sub.status,
      provider_type: 'stripe',
      provider_price_id: providerPriceId,
      unit_price: unitPrice,
      quantity: item?.quantity ?? 1,
    })
    .execute()
}

// Register once at module load — keeps the local subscription state in sync
// when Stripe reports lifecycle changes (upgrade, cancel, payment failure).
Payment.onSubscription({
  created: syncSubscription,
  updated: syncSubscription,
  deleted: async (event) => {
    const sub = event.data.object as Stripe.Subscription
    await db.updateTable('subscriptions')
      .set({ provider_status: 'canceled' })
      .where('provider_id', '=', sub.id)
      .execute()
  },
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
      const result = await Payment.processWebhook(raw, sig, { secret })
      if (!result?.success)
        return response.json({ error: result?.error || 'Invalid signature' }, 400)
      return response.json({ received: true })
    }
    catch {
      return response.json({ error: 'Invalid signature' }, 400)
    }
  },
})
