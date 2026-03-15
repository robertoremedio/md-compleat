import type { AiProvider } from '../provider.js';

export interface CliProviderConfig {
  cliCommand?: string;
}

// Stub — implementation pending. Tests should fail against this.
export class CliProvider implements AiProvider {
  constructor(_config: CliProviderConfig) {}

  async execute(_document: string, _signal?: AbortSignal): Promise<string> {
    throw new Error('Not implemented');
  }
}
