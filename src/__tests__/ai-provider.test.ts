import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

// All AI module imports are dynamic because the modules don't exist yet.
// Tests will fail at runtime with import errors — that's expected for TDD.

async function importFactory() {
  return import('../ai/provider-factory.js');
}

async function importHttpProvider() {
  return import('../ai/http-provider.js');
}

async function importCliProvider() {
  return import('../ai/cli-provider.js');
}

async function importPrompt() {
  return import('../ai/prompt.js');
}

// ---------------------------------------------------------------------------
// Provider Factory
// ---------------------------------------------------------------------------
describe('createProvider', () => {
  it('returns an HttpProvider for provider "anthropic"', async () => {
    const { createProvider } = await importFactory();
    const { HttpProvider } = await importHttpProvider();
    const provider = createProvider({ provider: 'anthropic', apiKey: 'k', model: 'm' });
    expect(provider).toBeInstanceOf(HttpProvider);
  });

  it('returns an HttpProvider for provider "openai"', async () => {
    const { createProvider } = await importFactory();
    const { HttpProvider } = await importHttpProvider();
    const provider = createProvider({ provider: 'openai', apiKey: 'k', model: 'm' });
    expect(provider).toBeInstanceOf(HttpProvider);
  });

  it('returns a CliProvider for provider "cli"', async () => {
    const { createProvider } = await importFactory();
    const { CliProvider } = await importCliProvider();
    const provider = createProvider({ provider: 'cli', cliCommand: 'echo' });
    expect(provider).toBeInstanceOf(CliProvider);
  });

  it('throws when provider is missing', async () => {
    const { createProvider } = await importFactory();
    expect(() => createProvider({})).toThrow('ai-provider attribute is required');
  });

  it('throws for an unknown provider value', async () => {
    const { createProvider } = await importFactory();
    expect(() => createProvider({ provider: 'unknown-llm' })).toThrow(
      'Unknown AI provider: unknown-llm',
    );
  });
});

// ---------------------------------------------------------------------------
// HttpProvider — Anthropic adapter
// ---------------------------------------------------------------------------
describe('HttpProvider with Anthropic adapter', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          content: [{ type: 'text', text: 'response-from-anthropic' }],
        }),
    });
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls fetch with correct Anthropic endpoint, headers, and body', async () => {
    const { createProvider } = await importFactory();

    const provider = createProvider({
      provider: 'anthropic',
      apiKey: 'test-key',
      model: 'claude-sonnet-4-20250514',
    });

    await provider.execute('# Hello');

    expect(fetchSpy).toHaveBeenCalledOnce();

    const [url, init] = fetchSpy.mock.calls[0];

    // Endpoint
    expect(url).toContain('/v1/messages');

    // Headers
    expect(init.headers).toMatchObject({
      'x-api-key': 'test-key',
      'anthropic-version': expect.any(String),
      'content-type': 'application/json',
    });

    // Body structure
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      model: 'claude-sonnet-4-20250514',
      system: expect.any(String),
      messages: expect.arrayContaining([
        expect.objectContaining({ role: 'user', content: expect.any(String) }),
      ]),
    });
  });

  it('returns the text content from the Anthropic response', async () => {
    const { createProvider } = await importFactory();

    const provider = createProvider({
      provider: 'anthropic',
      apiKey: 'k',
      model: 'm',
    });

    const result = await provider.execute('doc');
    expect(result).toBe('response-from-anthropic');
  });

  it('passes AbortSignal to fetch', async () => {
    const { createProvider } = await importFactory();

    const provider = createProvider({
      provider: 'anthropic',
      apiKey: 'k',
      model: 'm',
    });

    const controller = new AbortController();
    await provider.execute('doc', controller.signal);

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.signal).toBe(controller.signal);
  });

  it('throws on non-ok response with status info', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });

    const { createProvider } = await importFactory();

    const provider = createProvider({
      provider: 'anthropic',
      apiKey: 'k',
      model: 'm',
    });

    await expect(provider.execute('doc')).rejects.toThrow(/429/);
  });

  it('uses custom endpoint when provided', async () => {
    const { createProvider } = await importFactory();

    const provider = createProvider({
      provider: 'anthropic',
      apiKey: 'k',
      model: 'm',
      endpoint: 'https://custom.api.example.com/v1/messages',
    });

    await provider.execute('doc');

    const [url] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://custom.api.example.com/v1/messages');
  });
});

// ---------------------------------------------------------------------------
// HttpProvider — OpenAI adapter
// ---------------------------------------------------------------------------
describe('HttpProvider with OpenAI adapter', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: 'response-from-openai' } }],
        }),
    });
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls fetch with correct OpenAI endpoint, headers, and body', async () => {
    const { createProvider } = await importFactory();

    const provider = createProvider({
      provider: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4o',
    });

    await provider.execute('# Hello');

    expect(fetchSpy).toHaveBeenCalledOnce();

    const [url, init] = fetchSpy.mock.calls[0];

    // Endpoint
    expect(url).toContain('/v1/chat/completions');

    // Headers
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer test-key',
      'content-type': 'application/json',
    });

    // Body structure — OpenAI uses messages array with system role
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      model: 'gpt-4o',
      messages: expect.arrayContaining([
        expect.objectContaining({ role: 'system', content: expect.any(String) }),
        expect.objectContaining({ role: 'user', content: expect.any(String) }),
      ]),
    });
  });

  it('returns the text content from the OpenAI response', async () => {
    const { createProvider } = await importFactory();

    const provider = createProvider({
      provider: 'openai',
      apiKey: 'k',
      model: 'm',
    });

    const result = await provider.execute('doc');
    expect(result).toBe('response-from-openai');
  });
});

// ---------------------------------------------------------------------------
// CliProvider
// ---------------------------------------------------------------------------
describe('CliProvider', () => {
  it('throws "not supported in browser" error from execute()', async () => {
    const { createProvider } = await importFactory();
    const provider = createProvider({ provider: 'cli', cliCommand: 'echo' });
    await expect(provider.execute('doc')).rejects.toThrow(
      /not supported in browser/i,
    );
  });
});

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------
describe('getSystemPrompt', () => {
  it('returns a non-empty string', async () => {
    const { getSystemPrompt } = await importPrompt();
    const prompt = getSystemPrompt();
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('mentions the <ai tag convention', async () => {
    const { getSystemPrompt } = await importPrompt();
    const prompt = getSystemPrompt();
    expect(prompt).toContain('<ai');
  });
});

// ---------------------------------------------------------------------------
// Component attributes (DOM reflection)
// ---------------------------------------------------------------------------
describe('MdCompleat AI attributes', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  async function createElement(
    attributes: Record<string, string> = {},
  ) {
    const { MdCompleat } = await import('../md-compleat.js');
    const el = document.createElement('md-compleat') as InstanceType<
      typeof MdCompleat
    >;
    for (const [key, value] of Object.entries(attributes)) {
      el.setAttribute(key, value);
    }
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
  }

  it('reflects ai-provider attribute to aiProviderName property', async () => {
    const el = await createElement({ 'ai-provider': 'anthropic' });
    expect((el as any).aiProviderName).toBe('anthropic');
  });

  it('reflects ai-model attribute to aiModel property', async () => {
    const el = await createElement({ 'ai-model': 'gpt-4o' });
    expect((el as any).aiModel).toBe('gpt-4o');
  });

  it('reflects ai-api-key attribute to aiApiKey property', async () => {
    const el = await createElement({ 'ai-api-key': 'sk-test-123' });
    expect((el as any).aiApiKey).toBe('sk-test-123');
  });

  it('reflects ai-endpoint attribute to aiEndpoint property', async () => {
    const el = await createElement({
      'ai-endpoint': 'https://custom.example.com',
    });
    expect((el as any).aiEndpoint).toBe('https://custom.example.com');
  });

  it('reflects ai-cli-command attribute to aiCliCommand property', async () => {
    const el = await createElement({ 'ai-cli-command': 'my-llm-cli' });
    expect((el as any).aiCliCommand).toBe('my-llm-cli');
  });
});
