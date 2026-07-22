import type { AiConfig } from '@stacksjs/types'
import { env } from '@stacksjs/env'

interface BugHqAiConfig extends AiConfig {
  default: 'anthropic' | 'openai' | 'ollama'
  drivers: {
    anthropic: { apiKey: string, model: string, maxTokens: number }
    openai: { apiKey: string, model: string, maxTokens: number, baseUrl: string }
    ollama: { host: string, model: string }
  }
  autofix: {
    enabled: boolean
    draftPullRequests: boolean
    maxFiles: number
    maxSourceBytes: number
    branchPrefix: string
  }
}

/**
 * **AI Configuration**
 *
 * This configuration defines all of your AI options. Because Stacks is fully-typed, you
 * may hover any of the options below and the definitions will be provided. In case you
 * have any questions, feel free to reach out via Discord or GitHub Discussions.
 */
export default {
  default: String(env.AI_DRIVER || 'openai') as 'anthropic' | 'openai' | 'ollama',

  drivers: {
    anthropic: {
      apiKey: String(env.ANTHROPIC_API_KEY || ''),
      model: String(env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'),
      maxTokens: Number(env.ANTHROPIC_MAX_TOKENS || 8192),
    },
    openai: {
      apiKey: String(env.OPENAI_API_KEY || ''),
      model: String(env.OPENAI_MODEL || 'gpt-4o'),
      maxTokens: Number(env.OPENAI_MAX_TOKENS || 8192),
      baseUrl: String(env.OPENAI_BASE_URL || 'https://api.openai.com/v1'),
    },
    ollama: {
      host: String(env.OLLAMA_HOST || 'http://localhost:11434'),
      model: String(env.OLLAMA_MODEL || 'llama3.2'),
    },
  },

  autofix: {
    enabled: String(env.AI_AUTOFIX_ENABLED ?? 'true') !== 'false',
    draftPullRequests: String(env.AI_AUTOFIX_DRAFT ?? 'true') !== 'false',
    maxFiles: Math.min(10, Math.max(1, Number(env.AI_AUTOFIX_MAX_FILES || 5))),
    maxSourceBytes: Math.min(1024 * 1024, Math.max(64 * 1024, Number(env.AI_AUTOFIX_MAX_SOURCE_BYTES || 512 * 1024))),
    branchPrefix: String(env.AI_AUTOFIX_BRANCH_PREFIX || 'bughq/autofix'),
  },

  models: [
    // 'amazon.titan-embed-text-v1',
    // Supported use cases – Retrieval augmented generation, open-ended text generation, brainstorming, summarizations, code generation, table creation, data formatting, paraphrasing, chain of thought, rewrite, extraction, QnA, and chat
    'amazon.titan-text-express-v1',
    // Amazon Titan Text Lite is a light weight efficient model, ideal for fine-tuning of English-language tasks, including like summarizations and copy writing, where customers want a smaller, more cost-effective model that is also highly customizable
    'amazon.titan-text-lite-v1',
    // 'amazon.titan-embed-image-v1',
    // 'amazon.titan-image-generator-v1',
    // 'anthropic.claude-v1',
    // 'anthropic.claude-v2',
    // 'anthropic.claude-v2:1',
    // 'anthropic.claude-instant-v1',
    // 'meta.llama2-13b-chat-v1',
    'meta.llama2-70b-chat-v1',
  ],

  deploy: true, // deploys AI endpoints
} satisfies BugHqAiConfig
