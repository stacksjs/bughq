/**
 * TEMP debug harness: run the buddy deploy entry with process.exit / crash
 * hooks that write to a file, so a silent early exit(1) on CI reveals its stack.
 * Remove once the deploy is confirmed working.
 */
import { appendFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const LOG = '/tmp/exit.log'
const log = (m: string) => {
  try {
    appendFileSync(LOG, `${m}\n`)
  }
  catch {}
  // eslint-disable-next-line no-console
  console.error(m)
}

const realExit = process.exit.bind(process)
// @ts-expect-error override
process.exit = (code?: number) => {
  if (code)
    log(`[EXIT ${code}]\n${new Error('exit trace').stack}`)
  return realExit(code)
}
process.on('uncaughtException', e => log(`[uncaughtException] ${(e as any)?.stack || e}`))
process.on('unhandledRejection', e => log(`[unhandledRejection] ${(e as any)?.stack || e}`))

const flag = process.argv[2] || '--staging'
const cli = resolve('node_modules/@stacksjs/buddy/dist/cli.js')
// cli.js reads process.argv for its command; set it to the deploy invocation.
process.argv = [process.argv[0], cli, 'deploy', flag, '--yes']
log(`[debug-deploy] importing ${cli} with args ${process.argv.slice(2).join(' ')}`)
await import(cli)
log('[debug-deploy] import returned (cli did not exit)')
