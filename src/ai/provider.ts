export interface AiProvider {
  execute(document: string, signal?: AbortSignal): Promise<string>;
}

export interface ProviderConfig {
  model?: string;
  apiKey?: string;
  endpoint?: string;
}
