import type { AiProvider } from './provider.js';
import { HttpProvider, anthropicAdapter, openaiAdapter } from './http-provider.js';
import { CliProvider } from './cli-provider.js';

export function createProvider(config: {
  provider?: string;
  model?: string;
  apiKey?: string;
  endpoint?: string;
  cliCommand?: string;
}): AiProvider {
  if (!config.provider) {
    throw new Error('ai-provider attribute is required');
  }

  switch (config.provider) {
    case 'anthropic':
      return new HttpProvider(config, anthropicAdapter);
    case 'openai':
      return new HttpProvider(config, openaiAdapter);
    case 'cli':
      return new CliProvider(config);
    default:
      throw new Error(`Unknown AI provider: ${config.provider}`);
  }
}
