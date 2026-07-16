import type { DnsConfig } from '@stacksjs/types'
import { env } from '@stacksjs/env'

/**
 * **DNS Options** — declarative mirror of bughq.org's live Porkbun zone.
 *
 * IMPORTANT: `buddy deploy` already manages most of this zone automatically:
 *   - the apex + `www` A records are upserted to the provisioned box IP,
 *   - mail routing (MX → mail.bughq.org, SPF, DKIM, DMARC) is published by the
 *     deploy's mail step,
 *   - the `cloud.bughq.org` dashboard host is set by its own site.
 *
 * The deploy applies whatever's in the arrays below ADDITIVELY, and it does so
 * once per site domain (apex AND cloud.bughq.org, …). So any record here is
 * also created under every non-apex site — e.g. a `www` entry would spawn a
 * stray `www.cloud.bughq.org`. To avoid that we only declare the apex here (a
 * no-op re-affirm of what the deploy already set) and leave the rest to the
 * deploy. The full intended zone is documented in comments for reference.
 *
 * `APP_SERVER_IP` / `STAGING_SERVER_IP` (set in the encrypted .env.production)
 * pin the box IPs so this file never falls back to a stale address.
 */
const boxIp = env.APP_SERVER_IP || '91.98.39.176'

export default {
  // Apex only — the deploy also upserts `@` and `www` to the box IP.
  a: [
    { name: '@', address: boxIp, ttl: 600 },
  ],
  aaaa: [],
  cname: [],

  // Mail is published by the deploy's mail step; declaring MX/TXT here would
  // additively duplicate them under every site subdomain. Documented only:
  //   MX     @                 → mail.bughq.org (prio 10)
  //   TXT    @                 → v=spf1 ip4:<box> ~all
  //   TXT    mail._domainkey   → v=DKIM1; k=rsa; p=…
  //   TXT    _dmarc            → v=DMARC1; p=quarantine; rua=mailto:noreply@bughq.org
  mx: [],
  txt: [],

  // Registrar delegation (Porkbun); the deploy never writes nameservers.
  nameservers: [
    'curitiba.porkbun.com',
    'fortaleza.porkbun.com',
    'maceio.porkbun.com',
    'salvador.porkbun.com',
  ],
} satisfies DnsConfig
