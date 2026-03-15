import type { AiProvider } from './provider.js';

export class CliProvider implements AiProvider {
  private command: string;

  constructor(config: { cliCommand?: string }) {
    this.command = config.cliCommand || '';
  }

  async execute(_document: string, _signal?: AbortSignal): Promise<string> {
    throw new Error('CLI provider is not supported in browser environments');
  }
}
