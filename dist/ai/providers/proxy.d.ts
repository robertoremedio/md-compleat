import type { AiProvider } from '../provider.js';
export interface ProxyProviderConfig {
    endpoint?: string;
    proxyHeaders?: string;
}
export declare class ProxyProvider implements AiProvider {
    private readonly endpoint;
    private readonly headers;
    constructor(config: ProxyProviderConfig);
    execute(document: string, signal?: AbortSignal): Promise<string>;
}
