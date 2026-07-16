import { db } from '@stacksjs/database'
import { mail } from '@stacksjs/email'
import { appUrl } from '../Support/urls'
import { notifyChannels } from './channels'

/**
 * Issue alerts. Fired by the ingest for the two moments worth a human's
 * attention: an issue's FIRST occurrence, and a resolved issue coming back
 * (regression). Repeat occurrences only bump the counter and never alert, so
 * an error storm produces exactly one message.
 *
 * `dispatchAlerts` fans a single alert out to every destination — the owner
 * email plus any Slack/Discord channels on the project. Alerts are best-effort:
 * callers fire-and-forget so a slow or failing transport can never delay or
 * break the ingest path.
 */

const DASHBOARD_BASE = appUrl()

export type AlertKind = 'new' | 'regression'

export interface AlertIssue {
  id: string
  title: string
  culprit?: string | null
  level?: string | null
  environment?: string | null
  count?: number
}

export async function notifyIssueOpened(projectId: string, issue: AlertIssue, kind: AlertKind): Promise<void> {
  const owner = (await db.unsafe(
    `SELECT u.email, p.name AS project_name FROM projects p JOIN users u ON u.id = p.owner_id WHERE p.id = $1 LIMIT 1`,
    [projectId],
  ))?.[0]
  if (!owner?.email)
    return

  const projectName = owner.project_name || projectId
  const url = `${DASHBOARD_BASE}/issue/${issue.id}`
  const heading = kind === 'regression' ? 'Regression' : 'New issue'
  const subject = `[bughq] ${heading} in ${projectName}: ${issue.title}`

  const facts: Array<[string, string]> = [
    ['Project', projectName],
    ['Level', String(issue.level || 'error')],
  ]
  if (issue.culprit)
    facts.push(['Where', String(issue.culprit)])
  if (issue.environment)
    facts.push(['Environment', String(issue.environment)])
  if (kind === 'regression' && issue.count)
    facts.push(['Occurrences', String(issue.count)])

  const intro = kind === 'regression'
    ? 'An issue you resolved is happening again.'
    : 'A new issue was just captured.'

  const text = [
    intro,
    '',
    issue.title,
    ...facts.map(([k, v]) => `${k}: ${v}`),
    '',
    `View it: ${url}`,
  ].join('\n')

  const rows = facts
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#667085;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:4px 0;color:#0b0f19">${escapeHtml(v)}</td></tr>`)
    .join('')
  const html = `
<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px 16px;color:#0b0f19">
  <p style="margin:0 0 12px;font-size:14px;color:#4b5565">${escapeHtml(intro)}</p>
  <p style="margin:0 0 16px;font-size:16px;font-weight:600">${escapeHtml(issue.title)}</p>
  <table style="border-collapse:collapse;font-size:13px;margin-bottom:20px">${rows}</table>
  <a href="${url}" style="display:inline-block;background:#e11d48;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:10px">Open in bughq</a>
  <p style="margin:20px 0 0;font-size:12px;color:#97a1b2">You get this because you own ${escapeHtml(projectName)} on bughq. Repeat occurrences of the same issue will not email you again.</p>
</div>`

  await mail.send({ to: String(owner.email), subject, text, html })
}

/**
 * Fan a single alert out to every destination for the project: the owner email
 * and each enabled Slack/Discord channel. Each leg is independent (Promise
 * .allSettled) so one failing transport can't suppress the others, and the
 * whole thing is fire-and-forget from the ingest's perspective. Gate the CALL
 * with the per-project alert throttle (allowAlert) so this fires at most once
 * per throttle window, not once per transport.
 */
export async function dispatchAlerts(projectId: string, issue: AlertIssue, kind: AlertKind): Promise<void> {
  await Promise.allSettled([
    notifyIssueOpened(projectId, issue, kind),
    notifyChannels(projectId, issue, kind),
  ])
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
