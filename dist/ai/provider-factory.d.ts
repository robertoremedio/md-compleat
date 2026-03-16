import type { AiProvider } from './provider.js';
export declare function createProvider(config: {
    provider?: string;
    endpoint?: string;
    cliCommand?: string;
    proxyHeaders?: string;
}): AiProvider;
