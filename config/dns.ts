import type { DnsConfig } from '@stacksjs/types'
import { env } from '@stacksjs/env'

/**
 * **DNS Options** — declarative mirror of bughq.org's live DNS at Porkbun.
 *
 * `buddy deploy` (Hetzner path) reconciles DNS in two additive passes:
 *   1. the apex + `www` A records are UPSERTED to the freshly-provisioned box's
 *      public IP (so those two are always correct regardless of what's below);
 *   2. every record here is then additively synced — missing records are
 *      created, existing ones are never overwritten or deleted, and
 *      `nameservers` are never pushed (that's registrar delegation, not a zone
 *      record). See @stacksjs/dns `syncDnsConfig`.
 *
 * So this file is the source-of-truth for the mail + dashboard records; the
 * app A records are driven by the deploy. `APP_SERVER_IP` lets us pin the
 * box IP for the records the deploy doesn't own (the `cloud` dashboard host and
 * the SPF `ip4`); it's stamped into `.env`/CI once the box is provisioned.
 */
const boxIp = env.APP_SERVER_IP || '178.105.248.188'
const stagingIp = env.STAGING_SERVER_IP || '49.12.8.203'

export default {
  a: [
    // Apex + www — the deploy upserts these to the provisioned box IP.
    { name: '@', address: boxIp, ttl: 600 },
    { name: 'www', address: boxIp, ttl: 600 },

    // ts-cloud management dashboard → cloud.bughq.org (configurable via
    // TS_CLOUD_UI_SUBDOMAIN; see config/cloud.ts). Points at the same box.
    { name: env.TS_CLOUD_UI_SUBDOMAIN || 'cloud', address: boxIp, ttl: 600 },

    // Staging lives on its own box (staging.bughq.org / www.staging.bughq.org).
    { name: 'staging', address: stagingIp, ttl: 600 },
    { name: 'www.staging', address: stagingIp, ttl: 600 },
  ],
  aaaa: [],
  cname: [],
  mx: [
    // Inbound mail handled by the shared Stacks mail host.
    { name: '@', mailServer: 'mail.stacksjs.com', priority: 10, ttl: 600 },
  ],
  txt: [
    // SPF — authorize the app box to send. Kept in sync with the box IP.
    { name: '@', content: `v=spf1 ip4:${boxIp} ~all`, ttl: 600 },
    // DKIM public key for mail._domainkey.
    {
      name: 'mail._domainkey',
      content: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApC7w45SaOk3TZbAlW9QJ5BjsL6zGlIv+LaS9l++Ll+26z2LB8ISf4n/yNzA8mtYlDeDvYUnEmw/YnjylPIMHlIXE3n0o8kznvbccIuuY3DfEetk49jLm3W1rJ6CHjl2l4J1oMFW3Am2vXnyfeNqLWQ8tha2BD4WoqvNpy1Q9L1QoWBQjM8gaszMr6kUid+XRs8bPsZAjhE/fNubQKnxOo5kIzRsicdKFBZnLzrkPt/8Xdw87+VPC/Hg8SuybozQGY/R1Pzipjggom12IHzmuhqqlsbB4jgZmUzNNXy7fI4ZLp+lgLpBI8Z7s7qMxNaSJ6Vp4R2jrLh1v/C3Dj3Ec/wIDAQAB',
      ttl: 600,
    },
    // DMARC policy.
    { name: '_dmarc', content: 'v=DMARC1; p=quarantine; rua=mailto:noreply@bughq.org', ttl: 600 },
  ],

  // Registrar delegation (Porkbun). Documented here for reference; the deploy
  // never writes nameservers.
  nameservers: [
    'curitiba.porkbun.com',
    'fortaleza.porkbun.com',
    'maceio.porkbun.com',
    'salvador.porkbun.com',
  ],
} satisfies DnsConfig
