import type { AIDriver, AIMessage } from '@stacksjs/ai'
import { createAnthropicDriver, createOllamaDriver, createOpenAIDriver } from '@stacksjs/ai'
import aiConfig from '../../config/ai'

export interface GeneratedObject<T> {
  data: T
  provider: string
  model: string
}

function driver(): { instance: AIDriver, provider: string, model: string } {
  if (aiConfig.default === 'anthropic') {
    const config = aiConfig.drivers.anthropic
    return { instance: createAnthropicDriver(config), provider: 'anthropic', model: config.model }
  }
  if (aiConfig.default === 'ollama') {
    const config = aiConfig.drivers.ollama
    return { instance: createOllamaDriver(config), provider: 'ollama', model: config.model }
  }
  const config = aiConfig.drivers.openai
  return { instance: createOpenAIDriver(config), provider: 'openai', model: config.model }
}

function parseObject(content: string): unknown {
  const unfenced = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(unfenced)
  }
  catch {
    const start = unfenced.indexOf('{')
    const end = unfenced.lastIndexOf('}')
    if (start >= 0 && end > start)
      return JSON.parse(unfenced.slice(start, end + 1))
    throw new Error('AI response did not contain a JSON object')
  }
}

/**
 * Compatibility wrapper for the installed framework snapshot. It uses the
 * official Stacks AI driver factories and mirrors `createAIClient().generateObject()`
 * from the current core package until BugHQ's next framework upgrade.
 */
export async function generateObject<T>(
  prompt: string,
  system: string,
  validate: (value: unknown) => value is T,
): Promise<GeneratedObject<T>> {
  const selected = driver()
  const history: AIMessage[] = []
  let command = `${prompt}\n\nReturn one JSON object only. Do not use Markdown fences.`
  let lastError = 'invalid JSON response'
  for (let attempt = 0; attempt < 2; attempt++) {
    const content = await selected.instance.process(command, system, history)
    try {
      const data = parseObject(content)
      if (!validate(data))
        throw new Error('response did not match the required shape')
      return { data, provider: selected.provider, model: selected.model }
    }
    catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      history.push({ role: 'assistant', content })
      command = `Correct the previous response. Return one JSON object only. Validation error: ${lastError}`
    }
  }
  throw new Error(`AI response validation failed: ${lastError}`)
}
