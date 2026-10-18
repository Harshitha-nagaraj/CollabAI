/**
 * @file ai/provider-factory.ts
 *
 * Factory that reads AI_PROVIDER env var and returns the appropriate provider.
 * Defaults to heuristic if no external provider is configured.
 */

import type { LLMProvider } from './types.js';
import { HeuristicProvider } from './providers/heuristic.provider.js';
import { OpenAIProvider } from './providers/openai.provider.js';
import { logger } from '../utils/logger.js';

let cachedProvider: LLMProvider | null = null;

export function getAIProvider(): LLMProvider {
  if (cachedProvider) return cachedProvider;

  const providerName = process.env.AI_PROVIDER || 'heuristic';

  switch (providerName) {
    case 'openai': {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        logger.warn('AI_PROVIDER=openai but OPENAI_API_KEY is missing. Falling back to heuristic.');
        cachedProvider = new HeuristicProvider();
      } else {
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        cachedProvider = new OpenAIProvider(apiKey, model);
        logger.info(`AI Provider: OpenAI (${model})`);
      }
      break;
    }

    case 'heuristic':
    default:
      cachedProvider = new HeuristicProvider();
      logger.info('AI Provider: Heuristic (built-in)');
      break;
  }

  return cachedProvider;
}
