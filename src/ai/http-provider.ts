import type { AiProvider } from './provider.js';
import { getSystemPrompt } from './prompt.js';

export interface ApiAdapter {
  defaultEndpoint: string;
  buildHeaders(apiKey: string): Record<string, string>;
  buildBody(model: string, systemPrompt: string, document: string): unknown;
  extractContent(responseJson: unknown): string;
}

export const anthropicAdapter: ApiAdapter = {
  defaultEndpoint: 'https://api.anthropic.com/v1/messages',
  buildHeaders(apiKey: string) {
    return {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    };
  },
  buildBody(model: string, systemPrompt: string, document: string) {
    return {
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: document }],
      max_tokens: 4096,
    };
  },
  extractContent(responseJson: any): string {
    return responseJson.content[0].text;
  },
};

export const openaiAdapter: ApiAdapter = {
  defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
  buildHeaders(apiKey: string) {
    return {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    };
  },
  buildBody(model: string, systemPrompt: string, document: string) {
    return {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: document },
      ],
    };
  },
  extractContent(responseJson: any): string {
    return responseJson.choices[0].message.content;
  },
};

export class HttpProvider implements AiProvider {
  private endpoint: string;
  private apiKey: string;
  private model: string;
  private adapter: ApiAdapter;

  constructor(config: { endpoint?: string; apiKey?: string; model?: string }, adapter: ApiAdapter) {
    this.endpoint = config.endpoint || adapter.defaultEndpoint;
    this.apiKey = config.apiKey || '';
    this.model = config.model || '';
    this.adapter = adapter;
  }

  async execute(document: string, signal?: AbortSignal): Promise<string> {
    const systemPrompt = getSystemPrompt();
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.adapter.buildHeaders(this.apiKey),
      body: JSON.stringify(this.adapter.buildBody(this.model, systemPrompt, document)),
      signal,
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    return this.adapter.extractContent(json);
  }
}
