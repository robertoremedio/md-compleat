import type { AiProvider } from '../provider.js';
export interface CliProviderConfig {
    cliCommand?: string;
}
export declare class CliProvider implements AiProvider {
    private readonly command;
    constructor(config: CliProviderConfig);
    execute(document: string, signal?: AbortSignal): Promise<string>;
}
