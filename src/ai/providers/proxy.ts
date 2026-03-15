import type { AiProvider } from '../provider.js';

export interface ProxyProviderConfig {
  endpoint?: string;
  proxyHeaders?: string;
}

export class ProxyProvider implements AiProvider {
  private readonly endpoint: string;
  private readonly headers: Record<string, string>;

  constructor(config: ProxyProviderConfig) {
    if (!config.endpoint) {
      throw new Error('Proxy provider requires an endpoint');
    }
    this.endpoint = config.endpoint;

    this.headers = { 'Content-Type': 'application/json' };
    if (config.proxyHeaders) {
      const parsed = JSON.parse(config.proxyHeaders);
      Object.assign(this.headers, parsed);
    }
  }

  async execute(document: string, signal?: AbortSignal): Promise<string> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ document, format: 'markdown' }),
      signal,
    });

    if (!response.ok) {
      throw new Error(
        `Proxy request failed: ${response.status} ${response.statusText}`,
      );
    }

    const json = await response.json();
    if (typeof json.document !== 'string') {
      throw new Error(
        'Invalid proxy response: missing or non-string "document" field',
      );
    }

    return json.document;
  }
}
