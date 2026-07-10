/**
 * TEMP debug preload: hook process.exit + crash handlers and write the stack to
 * /tmp/exit.log, so a silent early exit(1) in the deploy path reveals its cause.
 * Loaded as the FIRST bunfig preload. Remove once the deploy is confirmed.
 */
import { appendFileSync } from 'node:fs'
import process from 'node:process'

const LOG = '/tmp/exit.log'
const write = (m: string) => {
  try {
    appendFileSync(LOG, `${m}\n`)
  }
  catch {}
}

const realExit = process.exit.bind(process)
// @ts-expect-error override signature
process.exit = (code?: number) => {
  if (code)
    write(`[EXIT ${code}] ${new Error('exit trace').stack}`)
  return realExit(code as any)
}
process.on('uncaughtException', (e) => {
  write(`[uncaughtException] ${(e as any)?.stack || e}`)
})
process.on('unhandledRejection', (e) => {
  write(`[unhandledRejection] ${(e as any)?.stack || e}`)
})
write(`[preload] argv=${process.argv.slice(2).join(' ')}`)
