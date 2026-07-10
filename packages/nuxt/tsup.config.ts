import { defineConfig } from 'tsup'

// Nuxt virtual imports (#app, #imports) and @nuxt/kit are resolved by the
// consumer's Nuxt build, so they stay external. Types are emitted for the
// module entry only (the runtime files import Nuxt virtuals that have no
// standalone types here).
export default defineConfig({
  entry: [
    'src/module.ts',
    'src/shared.ts',
    'src/runtime/plugin.client.ts',
    'src/runtime/nitro.server.ts',
  ],
  format: ['esm'],
  target: 'es2021',
  clean: true,
  dts: { entry: 'src/module.ts' },
  external: ['@nuxt/kit', '#app', '#imports', 'nuxt', 'nitropack', 'nitropack/runtime', 'vue', '@bughq/sdk'],
})
