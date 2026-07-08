// Site metadata + SEO. `buddy serve` loads this and injects accurate
// <title>, canonical, Open Graph, and Twitter card tags per page (replacing
// stx's "stx App" scaffold defaults). Per-path overrides live in `pages`.
const description = 'Error tracking for people who ship. Capture, group, and triage production errors with automatic fingerprinting. Built on Stacks and Postgres.'

export default {
  name: 'bughq',
  url: 'https://bughq.org',
  description,
  seo: {
    siteName: 'bughq',
    title: 'bughq - Error tracking for people who ship',
    description,
    image: 'https://bughq.org/og.png',
    favicon: '/favicon.svg',
    locale: 'en_US',
    type: 'website',
    twitter: 'stacksjs',
  },
  pages: {
    '/': {
      title: 'bughq - Error tracking for people who ship',
      description,
    },
    '/dashboard': {
      title: 'Issues - bughq',
      description: 'Grouped production errors with live counts, affected-user tallies, and severity triage.',
    },
  },
}
