import type { AiProvider } from './provider.js';
import { CliProvider } from './providers/cli.js';
import { ProxyProvider } from './providers/proxy.js';

export function createProvider(config: {
  provider?: string;
  endpoint?: string;
  cliCommand?: string;
  proxyHeaders?: string;
}): AiProvider {
  if (!config.provider) {
    throw new Error('ai-provider attribute is required');
  }

  switch (config.provider) {
    case 'cli':
      return new CliProvider(config);
    case 'proxy':
      return new ProxyProvider(config);
    default:
      throw new Error(`Unknown AI provider: ${config.provider}`);
  }
}
