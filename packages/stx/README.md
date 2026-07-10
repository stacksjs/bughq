# @bughq/stx

[bughq](https://bughq.org) error tracking for **Stacks / stx** apps — client and
server.

## Install

```sh
bun add @bughq/stx
```

## Server errors (Bun)

Report server-side errors from your Stacks app. Call `init` once at boot; then
`captureException` from your error pipeline (e.g. `config/errors.ts` or any
try/catch). Process handlers catch anything uncaught as a safety net.

```ts
import { init, captureException } from '@bughq/stx'

init({
  project: 'acme-web-9f2c1a',
  key: 'your-public-ingest-key',
  environment: 'production',
  // captureUnhandled: true (default) — also reports uncaughtException / unhandledRejection
})

try { await work() }
catch (err) { captureException(err, { job: 'nightly' }); throw err }
```

## Client errors (browser)

Drop the tracking snippet into a layout. Either render it from a `<script server>`
block:

```stx
<script server>
import { clientSnippet } from '@bughq/stx'
const bughqTag = clientSnippet({ project: 'acme-web-9f2c1a', key: 'your-public-ingest-key' })
</script>
{!! bughqTag !!}
```

…or copy the ready-made partial shipped at `@bughq/stx/BugHQ.stx` into your
`resources/` and include it (it reads `BUGHQ_PROJECT` / `BUGHQ_KEY` / `BUGHQ_HOST`
from env).

The ingest key is public (safe in client code). For richer client capture you can
also use [`@bughq/sdk`](../sdk) directly.
