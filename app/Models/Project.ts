import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

export default defineModel({
  name: 'Project',
  table: 'projects',
  primaryKey: 'id',

  traits: {
    useTimestamps: true,
    useApi: { uri: 'projects', routes: ['index', 'store', 'show', 'update', 'destroy'] },
  },

  hasMany: ['ErrorEvent', 'Issue'],

  indexes: [
    { name: 'projects_ingest_key_unique', columns: ['ingest_key'], unique: true },
  ],

  attributes: {
    id: { fillable: true, validation: { rule: schema.string().required() } },
    name: { fillable: true, validation: { rule: schema.string().required().max(255) } },
    platform: { fillable: true, validation: { rule: schema.string().optional() }, factory: () => 'javascript' },
    dsn: { fillable: true, validation: { rule: schema.string().optional() } },
    // Public ingest key: the SDK sends it as `X-BugHQ-Key` so reports can only
    // be written to a project that presents its key (revocable, not a secret).
    ingest_key: { fillable: true, validation: { rule: schema.string().optional() }, factory: () => globalThis.crypto.randomUUID().replace(/-/g, '') },
    owner_id: { fillable: true, validation: { rule: schema.number().optional() } },
    is_active: { fillable: true, validation: { rule: schema.boolean().optional() }, factory: () => true },
  },
})
