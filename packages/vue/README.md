# @bughq/vue

[bughq](https://bughq.org) error tracking for Vue 3. Captures uncaught errors,
unhandled rejections, **and** Vue component errors (via `app.config.errorHandler`,
preserving any handler you already set), tagged with the component name and
lifecycle hook.

## Install

```sh
bun add @bughq/vue   # or npm/pnpm/yarn
```

## Usage

```ts
import { createApp } from 'vue'
import BugHQ from '@bughq/vue'
import App from './App.vue'

createApp(App)
  .use(BugHQ, {
    project: 'acme-web-9f2c1a',
    key: 'your-public-ingest-key',
    release: '1.4.0',
    environment: import.meta.env.MODE,
  })
  .mount('#app')
```

Manual capture inside a component:

```vue
<script setup>
import { useBugHQ } from '@bughq/vue'
const { captureException, setUser } = useBugHQ()
</script>
```

Options are the [`@bughq/sdk`](../sdk) config plus `attachErrorHandler` (default
`true`) and `logErrors` (default `false`). Pass a `dsn` instead of
`project`/`key` if you prefer. `this.$bughq` is available in the Options API.
