/**
 * @file ai/providers/openai.provider.ts
 *
 * OpenAI adapter implementing LLMProvider.
 * Uses fetch directly — no SDK dependency.
 * Activated when AI_PROVIDER=openai and OPENAI_API_KEY are set.
 */

import type { LLMProvider, LLMCompletionOptions, PromptPayload } from '../types.js';
import { logger } from '../../utils/logger.js';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(apiKey: string, model = 'gpt-4o-mini', baseUrl = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl;
  }

  async complete(prompt: PromptPayload, options?: LLMCompletionOptions): Promise<string> {
    const body: any = {
      model: this.model,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 2000,
    };

    if (options?.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`OpenAI API error (${response.status}): ${errorText}`);
        throw new Error(`OpenAI API returned ${response.status}`);
      }

      const data = await response.json() as any;
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      logger.error('OpenAI provider error:', error);
      throw error;
    }
  }
}
