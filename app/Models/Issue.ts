import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

/**
 * An Issue groups ErrorEvents sharing a fingerprint — the unit of triage.
 * Occurrence counters roll up as events arrive; status/assignee track work.
 */
export default defineModel({
  name: 'Issue',
  table: 'issues',
  primaryKey: 'id',

  traits: {
    useTimestamps: true,
    useApi: { uri: 'issues', routes: ['index', 'show', 'update'] },
  },

  belongsTo: ['Project'],
  hasMany: ['ErrorEvent'],

  indexes: [
    { name: 'issues_project_fingerprint', columns: ['project_id', 'fingerprint'], unique: true },
    { name: 'issues_project_lastseen', columns: ['project_id', 'last_seen'] },
  ],

  attributes: {
    id: { fillable: true, validation: { rule: schema.string().required() } },
    project_id: { fillable: true, validation: { rule: schema.string().required() } },
    fingerprint: { fillable: true, validation: { rule: schema.string().required() } },
    title: { fillable: true, validation: { rule: schema.string().required().max(500) } },
    culprit: { fillable: true, validation: { rule: schema.string().optional() } },
    error_type: { fillable: true, validation: { rule: schema.string().optional() } },
    level: { fillable: true, validation: { rule: schema.string().optional() }, factory: () => 'error' },
    status: { fillable: true, validation: { rule: schema.string().optional() }, factory: () => 'unresolved' },
    assignee: { fillable: true, validation: { rule: schema.string().optional() } },
    count: { fillable: true, validation: { rule: schema.number().optional() }, factory: () => 0 },
    users_affected: { fillable: true, validation: { rule: schema.number().optional() }, factory: () => 0 },
    first_seen: { fillable: true, validation: { rule: schema.string().optional() } },
    last_seen: { fillable: true, validation: { rule: schema.string().optional() } },
  },
})
