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

  attributes: {
    id: { fillable: true, validation: { rule: schema.string().required() } },
    name: { fillable: true, validation: { rule: schema.string().required().max(255) } },
    platform: { fillable: true, validation: { rule: schema.string().optional() }, factory: () => 'javascript' },
    dsn: { fillable: true, validation: { rule: schema.string().optional() } },
    owner_id: { fillable: true, validation: { rule: schema.number().optional() } },
    is_active: { fillable: true, validation: { rule: schema.boolean().optional() }, factory: () => true },
  },
})
