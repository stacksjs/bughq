# @bughq/nuxt

[bughq](https://bughq.org) error tracking for Nuxt 3/4. A module that captures
client errors (Vue component errors via `vue:error`, plus window errors) and
server/SSR errors (via a Nitro `error` hook).

## Install

```sh
bun add @bughq/nuxt   # or npm/pnpm/yarn
```

## Usage

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@bughq/nuxt'],
  bughq: {
    project: 'acme-web-9f2c1a',
    key: 'your-public-ingest-key',
    release: process.env.RELEASE,
    // environment defaults to 'production'
  },
})
```

That's it — no plugin file to write. Options are the [`@bughq/sdk`](../sdk) config
(or pass a single `dsn`). Config is exposed via `runtimeConfig.public.bughq` (the
ingest key is public by design), so you can also set it at runtime with
`NUXT_PUBLIC_BUGHQ_*` env vars.

Manual capture anywhere:

```ts
import { captureException } from '@bughq/sdk'
captureException(err, { orderId: 42 })
```
