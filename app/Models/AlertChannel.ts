import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

/**
 * A destination bughq delivers issue alerts to (Slack or Discord incoming
 * webhook), scoped to a project. Fired alongside the owner email on a new
 * issue or a regression — see app/Errors/channels.ts.
 *
 * `webhook_url` holds a provider secret, so there's no `useApi`: channels are
 * managed only through the owner-scoped routes in routes/projects.ts, never a
 * public CRUD surface.
 */
export default defineModel({
  name: 'AlertChannel',
  table: 'alert_channels',
  primaryKey: 'id',

  traits: {
    useTimestamps: true,
  },

  belongsTo: ['Project'],

  indexes: [
    { name: 'alert_channels_project', columns: ['project_id'] },
  ],

  attributes: {
    id: { fillable: true, validation: { rule: schema.string().required() } },
    project_id: { fillable: true, validation: { rule: schema.string().required() } },
    // 'slack' | 'discord' — the provider whose webhook format we render.
    type: { fillable: true, validation: { rule: schema.string().required().max(20) } },
    label: { fillable: true, validation: { rule: schema.string().optional().max(255) } },
    webhook_url: { fillable: true, validation: { rule: schema.string().required() } },
    enabled: { fillable: true, validation: { rule: schema.boolean().optional() }, factory: () => true },
  },
})
