# @bughq/sdk

Framework-agnostic error-tracking client for [bughq](https://bughq.org). Captures
uncaught errors and unhandled promise rejections and reports them to your bughq
project. For framework-aware capture use [`@bughq/vue`](../vue),
[`@bughq/nuxt`](../nuxt), or [`@bughq/stx`](../stx) — they build on this.

## Install

```sh
bun add @bughq/sdk   # or npm/pnpm/yarn
```

## Usage

```ts
import { bughq } from '@bughq/sdk'

bughq.init({
  project: 'acme-web-9f2c1a',
  key: 'your-public-ingest-key',
  release: '1.4.0',
  environment: 'production',
})

// manual capture
import { captureException, captureMessage, setUser } from '@bughq/sdk'
setUser({ id: 'u_88', email: 'jane@acme.com' })
try { risky() }
catch (err) { captureException(err, { orderId: 42 }) }
```

You can also pass a single `dsn` instead of `project`/`key`/`host`:

```ts
bughq.init({ dsn: 'https://<ingest_key>@bughq.org/acme-web-9f2c1a' })
```

## Config

| Option | Default | Notes |
|---|---|---|
| `project` / `key` | — | From your bughq dashboard. The key is public (safe in client code). |
| `host` | `https://bughq.org` | Self-hosted? Point at your instance. |
| `dsn` | — | `https://<key>@<host>/<project>` — an alternative to the three above. |
| `release` / `environment` | `production` | Tag every event. |
| `enabled` | `true` | Set `false` to turn capture off (e.g. in dev). |
| `sampleRate` | `1` | Fraction of events to send (0..1). |
| `dedupeMs` | `5000` | Drop repeats of the same error within this window. |
| `beforeSend(event)` | — | Inspect/mutate; return `null` to drop. |

The key is a revocable identifier, not a secret — shipping it in your bundle is by
design. Note: bughq stores messages/stacks up to 255 chars (full stacks are used
for grouping before truncation).
