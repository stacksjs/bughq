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
    message: { fillable: true, validation: { rule: schema.string().required() } },
    stack: { fillable: true, validation: { rule: schema.string().optional() } },
    error_type: { fillable: true, validation: { rule: schema.string().optional() } },
    category: { fillable: true, validation: { rule: schema.string().optional() } },
    severity: { fillable: true, validation: { rule: schema.string().optional() }, factory: () => 'error' },
    fingerprint: { fillable: true, validation: { rule: schema.string().optional() } },
    url: { fillable: true, validation: { rule: schema.string().optional() } },
    browser: { fillable: true, validation: { rule: schema.string().optional() } },
    os: { fillable: true, validation: { rule: schema.string().optional() } },
    user_agent: { fillable: true, validation: { rule: schema.string().optional() } },
    framework: { fillable: true, validation: { rule: schema.string().optional() } },
    release: { fillable: true, validation: { rule: schema.string().optional() } },
    environment: { fillable: true, validation: { rule: schema.string().optional() }, factory: () => 'production' },
    user_context: { fillable: true, validation: { rule: schema.string().optional() } },
    metadata: { fillable: true, validation: { rule: schema.string().optional() } },
    timestamp: { fillable: true, validation: { rule: schema.string().required() } },
  },
})
