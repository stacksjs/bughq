import { captureException, init } from '@bughq/sdk'
// eslint-disable-next-line import/no-unresolved -- resolved by Nuxt at build time
import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { bughqEnabled } from '../shared'

/**
 * Client plugin: initializes the SDK (installs window error handlers) and
 * captures Vue/component errors through Nuxt's `vue:error` hook.
 */
export default defineNuxtPlugin({
  name: 'bughq',
  enforce: 'pre',
  setup(nuxtApp: any) {
    const config = (useRuntimeConfig().public as any).bughq ?? {}
    if (!bughqEnabled(config))
      return

    init({ ...config, framework: 'nuxt' })

    nuxtApp.hook('vue:error', (err: unknown, _instance: unknown, info: string) => {
      captureException(err, { lifecycle: info })
    })
  },
})
