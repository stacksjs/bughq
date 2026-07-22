import { Job } from '@stacksjs/queue'
import { runAutofix } from '../Autofix/workflow'

export default new Job({
  name: 'RunAutofix',
  description: 'Analyze a BugHQ issue, prepare a source fix, and open a draft pull request',
  queue: 'autofix',
  tries: 1,
  timeout: 600,

  async handle(payload: { runId: string }) {
    await runAutofix(payload.runId)
  },
})
