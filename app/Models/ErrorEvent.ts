import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

/**
 * A single captured error occurrence. Many ErrorEvents roll up into one Issue
 * (via fingerprint). Ported from ts-analytics' Error model.
 */
export default defineModel({
  name: 'ErrorEvent',
  table: 'error_events',
  primaryKey: 'id',

  traits: {
    useTimestamps: true,
  },

  belongsTo: ['Project', 'Issue'],

  indexes: [
    { name: 'ee_project_timestamp', columns: ['project_id', 'timestamp'] },
    { name: 'ee_issue', columns: ['issue_id'] },
    { name: 'ee_fingerprint', columns: ['project_id', 'fingerprint'] },
  ],

  attributes: {
    id: { fillable: true, validation: { rule: schema.string().required() } },
    project_id: { fillable: true, validation: { rule: schema.string().required() } },
    issue_id: { fillable: true, validation: { rule: schema.string().optional() } },
    // Long/rich columns are widened to Postgres' varchar cap (effectively
    // unlimited) so full stack traces + the rich `metadata` JSON (breadcrumbs,
    // tags, contexts, sdk, session) persist untruncated. See migration 0129.
    message: { fillable: true, validation: { rule: schema.string().required().max(10485760) } },
    stack: { fillable: true, validation: { rule: schema.string().max(10485760).optional() } },
    error_type: { fillable: true, validation: { rule: schema.string().optional() } },
    category: { fillable: true, validation: { rule: schema.string().optional() } },
    severity: { fillable: true, validation: { rule: schema.string().optional() }, factory: () => 'error' },
    fingerprint: { fillable: true, validation: { rule: schema.string().optional() } },
    url: { fillable: true, validation: { rule: schema.string().max(2048).optional() } },
    browser: { fillable: true, validation: { rule: schema.string().optional() } },
    os: { fillable: true, validation: { rule: schema.string().optional() } },
    user_agent: { fillable: true, validation: { rule: schema.string().max(1024).optional() } },
    framework: { fillable: true, validation: { rule: schema.string().optional() } },
    release: { fillable: true, validation: { rule: schema.string().optional() } },
    environment: { fillable: true, validation: { rule: schema.string().optional() }, factory: () => 'production' },
    user_context: { fillable: true, validation: { rule: schema.string().max(10485760).optional() } },
    metadata: { fillable: true, validation: { rule: schema.string().max(10485760).optional() } },
    timestamp: { fillable: true, validation: { rule: schema.string().required() } },
  },
})
