import type { SaasConfig } from '@stacksjs/types'

/**
 * **SaaS / billing plans**
 *
 * The **Free** tier is implicit: a user with no active subscription is on Free
 * (see the free-tier limits enforced in the ingest/creation paths). The **Pro**
 * plan below is pushed to Stripe by `createStripeProduct()` — `pricing[].key`
 * becomes the Stripe `lookup_key` the checkout resolves. Self-hosted
 * deployments leave the `STRIPE_*` env vars unset, so billing is inert and
 * every feature is unlocked.
 */
export default {
  plans: [
    {
      productName: 'bughq Pro',
      description: 'Unlimited projects and errors, full history, and priority support.',
      pricing: [
        { key: 'bughq_pro_monthly', price: 1900, interval: 'month', currency: 'usd' },
        { key: 'bughq_pro_yearly', price: 19000, interval: 'year', currency: 'usd' },
      ],
      metadata: { createdBy: 'bughq', version: '1.0.0' },
    },
  ],
} satisfies SaasConfig
