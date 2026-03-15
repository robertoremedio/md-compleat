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

async function importProxyProvider() {
  return import('../ai/providers/proxy.js');
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

  it('includes the document content in the user message', async () => {
    const { createProvider } = await importFactory();

    const provider = createProvider({
      provider: 'anthropic',
      apiKey: 'k',
      model: 'm',
    });

    await provider.execute('# My Document\n\nSome content here.');

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.messages[0].content).toContain('# My Document');
  });

  it('includes the system prompt in the request body', async () => {
    const { createProvider } = await importFactory();
    const { getSystemPrompt } = await importPrompt();

    const provider = createProvider({
      provider: 'anthropic',
      apiKey: 'k',
      model: 'm',
    });

    await provider.execute('doc');

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.system).toBe(getSystemPrompt());
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

  it('passes AbortSignal to fetch', async () => {
    const { createProvider } = await importFactory();

    const provider = createProvider({
      provider: 'openai',
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
      status: 401,
      statusText: 'Unauthorized',
    });

    const { createProvider } = await importFactory();

    const provider = createProvider({
      provider: 'openai',
      apiKey: 'bad-key',
      model: 'm',
    });

    await expect(provider.execute('doc')).rejects.toThrow(/401/);
  });

  it('uses custom endpoint when provided', async () => {
    const { createProvider } = await importFactory();

    const provider = createProvider({
      provider: 'openai',
      apiKey: 'k',
      model: 'm',
      endpoint: 'https://custom.openai.example.com/v1/chat/completions',
    });

    await provider.execute('doc');

    const [url] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://custom.openai.example.com/v1/chat/completions');
  });

  it('includes the document content in the user message', async () => {
    const { createProvider } = await importFactory();

    const provider = createProvider({
      provider: 'openai',
      apiKey: 'k',
      model: 'm',
    });

    await provider.execute('# My Document\n\nSome content here.');

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    const userMessage = body.messages.find((m: any) => m.role === 'user');
    expect(userMessage.content).toContain('# My Document');
  });
});

// ---------------------------------------------------------------------------
// CliProvider
// ---------------------------------------------------------------------------

async function importCliProviderNew() {
  return import('../ai/providers/cli.js');
}

describe('CliProvider', () => {
  // -- Constructor validation ------------------------------------------------

  it('throws when cliCommand is missing', async () => {
    const { CliProvider } = await importCliProviderNew();
    expect(() => new CliProvider({})).toThrow();
  });

  it('throws when cliCommand is empty string', async () => {
    const { CliProvider } = await importCliProviderNew();
    expect(() => new CliProvider({ cliCommand: '' })).toThrow();
  });

  it('constructs successfully with a valid cliCommand', async () => {
    const { CliProvider } = await importCliProviderNew();
    const provider = new CliProvider({ cliCommand: 'my-llm' });
    expect(provider).toBeDefined();
  });

  // -- Environment detection -------------------------------------------------

  it('throws descriptive error when child_process is not available', async () => {
    // Mock child_process to simulate a browser environment where it's unavailable.
    vi.doMock('child_process', () => {
      throw new Error('Cannot find module');
    });
    const { CliProvider } = await import('../ai/providers/cli.js');
    const provider = new CliProvider({ cliCommand: 'my-llm' });
    await expect(provider.execute('doc')).rejects.toThrow(
      /child_process not available/i,
    );
    vi.restoreAllMocks();
  });

  // -- Command spawning and stdin/stdout piping ------------------------------

  describe('with mocked child_process', () => {
    let spawnMock: ReturnType<typeof vi.fn>;
    let mockStdin: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
    let mockStdout: { on: ReturnType<typeof vi.fn> };
    let mockStderr: { on: ReturnType<typeof vi.fn> };
    let mockChild: {
      stdin: typeof mockStdin;
      stdout: typeof mockStdout;
      stderr: typeof mockStderr;
      on: ReturnType<typeof vi.fn>;
      kill: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockStdin = { write: vi.fn(), end: vi.fn() };
      mockStdout = { on: vi.fn() };
      mockStderr = { on: vi.fn() };
      mockChild = {
        stdin: mockStdin,
        stdout: mockStdout,
        stderr: mockStderr,
        on: vi.fn(),
        kill: vi.fn(),
      };
      spawnMock = vi.fn().mockReturnValue(mockChild);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    // Helper: resolve the child process with data
    function simulateSuccess(stdout: string) {
      // When stdout.on('data', cb) is called, capture the callback and invoke it
      mockStdout.on.mockImplementation((event: string, cb: (data: Buffer) => void) => {
        if (event === 'data') cb(Buffer.from(stdout));
      });
      mockStderr.on.mockImplementation((_event: string, _cb: (data: Buffer) => void) => {
        // no stderr
      });
      // When child.on('close', cb) is called, invoke with exit code 0
      mockChild.on.mockImplementation((event: string, cb: (code: number) => void) => {
        if (event === 'close') cb(0);
      });
    }

    function simulateFailure(exitCode: number, stderr: string) {
      mockStdout.on.mockImplementation((_event: string, _cb: (data: Buffer) => void) => {
        // no stdout
      });
      mockStderr.on.mockImplementation((event: string, cb: (data: Buffer) => void) => {
        if (event === 'data') cb(Buffer.from(stderr));
      });
      mockChild.on.mockImplementation((event: string, cb: (code: number) => void) => {
        if (event === 'close') cb(exitCode);
      });
    }

    function simulateProcessError(errorMessage: string) {
      mockStdout.on.mockImplementation(() => {});
      mockStderr.on.mockImplementation(() => {});
      mockChild.on.mockImplementation((event: string, cb: (arg: any) => void) => {
        if (event === 'error') cb(new Error(errorMessage));
      });
    }

    async function createMockedProvider(cliCommand: string) {
      // Mock the dynamic import of child_process
      vi.doMock('child_process', () => ({ spawn: spawnMock }));
      // Must re-import after mocking
      const { CliProvider } = await import('../ai/providers/cli.js');
      return new CliProvider({ cliCommand });
    }

    it('spawns the correct command with args split on whitespace', async () => {
      simulateSuccess('output');
      const provider = await createMockedProvider('my-llm --format md');

      await provider.execute('doc');

      expect(spawnMock).toHaveBeenCalledWith(
        'my-llm',
        ['--format', 'md'],
        expect.objectContaining({ stdio: ['pipe', 'pipe', 'pipe'] }),
      );
    });

    it('writes system prompt and document to stdin', async () => {
      simulateSuccess('output');
      const provider = await createMockedProvider('my-llm');
      const { getSystemPrompt } = await importPrompt();

      await provider.execute('# Hello World');

      const writtenData = mockStdin.write.mock.calls.map((c: any[]) => c[0]).join('');
      expect(writtenData).toContain(getSystemPrompt());
      expect(writtenData).toContain('# Hello World');
      expect(writtenData).toContain('---'); // separator between system prompt and document
      expect(mockStdin.end).toHaveBeenCalled();
    });

    it('returns stdout on successful exit (code 0)', async () => {
      simulateSuccess('AI generated response');
      const provider = await createMockedProvider('my-llm');

      const result = await provider.execute('doc');
      expect(result).toBe('AI generated response');
    });

    it('rejects with stderr content on non-zero exit code', async () => {
      simulateFailure(1, 'command failed: invalid input');
      const provider = await createMockedProvider('my-llm');

      await expect(provider.execute('doc')).rejects.toThrow(/command failed/i);
    });

    it('includes exit code in error on non-zero exit', async () => {
      simulateFailure(127, 'not found');
      const provider = await createMockedProvider('my-llm');

      await expect(provider.execute('doc')).rejects.toThrow(/127/);
    });

    it('rejects on process error event (e.g. command not found)', async () => {
      simulateProcessError('spawn my-llm ENOENT');
      const provider = await createMockedProvider('my-llm');

      await expect(provider.execute('doc')).rejects.toThrow(/ENOENT/);
    });

    it('kills child process when AbortSignal fires', async () => {
      // Don't resolve the process — it should be killed
      mockStdout.on.mockImplementation(() => {});
      mockStderr.on.mockImplementation(() => {});
      mockChild.on.mockImplementation(() => {});

      const provider = await createMockedProvider('my-llm');
      const controller = new AbortController();

      const promise = provider.execute('doc', controller.signal);
      // Yield microtasks so the dynamic import('child_process') inside
      // execute() resolves and the abort listener is registered.
      await new Promise((r) => setTimeout(r, 0));
      controller.abort();

      // The promise should reject
      await expect(promise).rejects.toThrow();
      // And the child process should be killed
      expect(mockChild.kill).toHaveBeenCalled();
    });

    it('rejects immediately if signal is already aborted', async () => {
      const provider = await createMockedProvider('my-llm');
      const controller = new AbortController();
      controller.abort();

      await expect(provider.execute('doc', controller.signal)).rejects.toThrow();
      // Should NOT have spawned a process
      expect(spawnMock).not.toHaveBeenCalled();
    });

    it('handles command with single word (no args)', async () => {
      simulateSuccess('output');
      const provider = await createMockedProvider('llm');

      await provider.execute('doc');

      expect(spawnMock).toHaveBeenCalledWith(
        'llm',
        [],
        expect.objectContaining({ stdio: ['pipe', 'pipe', 'pipe'] }),
      );
    });

    // -- Changes 1 & 2: Settlement guard + abort listener cleanup -------------

    it('removes abort listener after successful completion', async () => {
      simulateSuccess('output');
      const provider = await createMockedProvider('my-llm');
      const controller = new AbortController();

      const removeListenerSpy = vi.spyOn(controller.signal, 'removeEventListener');

      await provider.execute('doc', controller.signal);

      expect(removeListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function));
    });

    it('removes abort listener after failed completion', async () => {
      simulateFailure(1, 'error output');
      const provider = await createMockedProvider('my-llm');
      const controller = new AbortController();

      const removeListenerSpy = vi.spyOn(controller.signal, 'removeEventListener');

      await expect(provider.execute('doc', controller.signal)).rejects.toThrow();

      expect(removeListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function));
    });

    it('removes abort listener after process error', async () => {
      simulateProcessError('spawn ENOENT');
      const provider = await createMockedProvider('my-llm');
      const controller = new AbortController();

      const removeListenerSpy = vi.spyOn(controller.signal, 'removeEventListener');

      await expect(provider.execute('doc', controller.signal)).rejects.toThrow();

      expect(removeListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function));
    });

    // -- Change 3: Shell-quote command parsing --------------------------------

    it('parses double-quoted arguments in command string', async () => {
      simulateSuccess('output');
      const provider = await createMockedProvider('my-llm --prompt "hello world"');

      await provider.execute('doc');

      expect(spawnMock).toHaveBeenCalledWith(
        'my-llm',
        ['--prompt', 'hello world'],
        expect.objectContaining({ stdio: ['pipe', 'pipe', 'pipe'] }),
      );
    });

    it('parses single-quoted arguments in command string', async () => {
      simulateSuccess('output');
      const provider = await createMockedProvider("my-llm --msg 'hi there'");

      await provider.execute('doc');

      expect(spawnMock).toHaveBeenCalledWith(
        'my-llm',
        ['--msg', 'hi there'],
        expect.objectContaining({ stdio: ['pipe', 'pipe', 'pipe'] }),
      );
    });

    it('handles mixed quoting styles in command string', async () => {
      simulateSuccess('output');
      const provider = await createMockedProvider(`my-llm --a "hello world" --b 'foo bar'`);

      await provider.execute('doc');

      expect(spawnMock).toHaveBeenCalledWith(
        'my-llm',
        ['--a', 'hello world', '--b', 'foo bar'],
        expect.objectContaining({ stdio: ['pipe', 'pipe', 'pipe'] }),
      );
    });

    // -- Shell operator rejection -----------------------------------------------

    it('rejects command containing && operator', async () => {
      const provider = await createMockedProvider('my-llm && rm -rf /');
      await expect(provider.execute('doc')).rejects.toThrow(/shell operators/i);
      expect(spawnMock).not.toHaveBeenCalled();
    });

    it('rejects command containing pipe operator', async () => {
      const provider = await createMockedProvider('my-llm | grep foo');
      await expect(provider.execute('doc')).rejects.toThrow(/shell operators/i);
      expect(spawnMock).not.toHaveBeenCalled();
    });

    it('rejects command containing semicolon operator', async () => {
      const provider = await createMockedProvider('my-llm ; echo pwned');
      await expect(provider.execute('doc')).rejects.toThrow(/shell operators/i);
      expect(spawnMock).not.toHaveBeenCalled();
    });

    it('rejects command containing redirect operator', async () => {
      const provider = await createMockedProvider('my-llm > output.txt');
      await expect(provider.execute('doc')).rejects.toThrow(/shell operators/i);
      expect(spawnMock).not.toHaveBeenCalled();
    });
  });

  // -- Factory integration ---------------------------------------------------

  it('factory routes provider "cli" to CliProvider', async () => {
    const { createProvider } = await importFactory();
    const { CliProvider } = await importCliProviderNew();
    const provider = createProvider({ provider: 'cli', cliCommand: 'echo' });
    expect(provider).toBeInstanceOf(CliProvider);
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
// ProxyProvider
// ---------------------------------------------------------------------------
describe('ProxyProvider', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ document: 'resolved-markdown' }),
    });
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends POST to endpoint with correct body and Content-Type', async () => {
    const { ProxyProvider } = await importProxyProvider();

    const provider = new ProxyProvider({
      endpoint: 'https://my-proxy.example.com/ai',
    });

    await provider.execute('# My Document');

    expect(fetchSpy).toHaveBeenCalledOnce();

    const [url, init] = fetchSpy.mock.calls[0];

    expect(url).toBe('https://my-proxy.example.com/ai');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
    });

    const body = JSON.parse(init.body);
    expect(body).toEqual({
      document: '# My Document',
      format: 'markdown',
    });
  });

  it('returns the document field from the response', async () => {
    const { ProxyProvider } = await importProxyProvider();

    const provider = new ProxyProvider({
      endpoint: 'https://my-proxy.example.com/ai',
    });

    const result = await provider.execute('doc');
    expect(result).toBe('resolved-markdown');
  });

  it('forwards AbortSignal to fetch', async () => {
    const { ProxyProvider } = await importProxyProvider();

    const provider = new ProxyProvider({
      endpoint: 'https://my-proxy.example.com/ai',
    });

    const controller = new AbortController();
    await provider.execute('doc', controller.signal);

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.signal).toBe(controller.signal);
  });

  it('merges custom headers from proxyHeaders JSON', async () => {
    const { ProxyProvider } = await importProxyProvider();

    const provider = new ProxyProvider({
      endpoint: 'https://my-proxy.example.com/ai',
      proxyHeaders: JSON.stringify({
        Authorization: 'Bearer my-token',
        'X-Custom': 'value',
      }),
    });

    await provider.execute('doc');

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer my-token',
      'X-Custom': 'value',
    });
  });

  it('throws on non-ok response with status info', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
    });

    const { ProxyProvider } = await importProxyProvider();

    const provider = new ProxyProvider({
      endpoint: 'https://my-proxy.example.com/ai',
    });

    await expect(provider.execute('doc')).rejects.toThrow(/502/);
  });

  it('throws when response JSON is missing document field', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ text: 'wrong field' }),
    });

    const { ProxyProvider } = await importProxyProvider();

    const provider = new ProxyProvider({
      endpoint: 'https://my-proxy.example.com/ai',
    });

    await expect(provider.execute('doc')).rejects.toThrow(/document/i);
  });

  it('throws when endpoint is missing from config', async () => {
    const { ProxyProvider } = await importProxyProvider();

    expect(() => new ProxyProvider({})).toThrow();
  });

  it('throws when proxyHeaders is invalid JSON', async () => {
    const { ProxyProvider } = await importProxyProvider();

    expect(
      () =>
        new ProxyProvider({
          endpoint: 'https://my-proxy.example.com/ai',
          proxyHeaders: 'not-valid-json',
        }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Provider Factory — proxy
// ---------------------------------------------------------------------------
describe('createProvider with proxy', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ document: 'result' }),
    });
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a ProxyProvider for provider "proxy"', async () => {
    const { createProvider } = await importFactory();
    const { ProxyProvider } = await importProxyProvider();

    const provider = createProvider({
      provider: 'proxy',
      endpoint: 'https://my-proxy.example.com/ai',
    });

    expect(provider).toBeInstanceOf(ProxyProvider);
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

  it('reflects ai-proxy-headers attribute to aiProxyHeaders property', async () => {
    const headers = JSON.stringify({ Authorization: 'Bearer tok' });
    const el = await createElement({ 'ai-proxy-headers': headers });
    expect((el as any).aiProxyHeaders).toBe(headers);
  });

  // -------------------------------------------------------------------------
  // Custom provider property (aiProvider) and getActiveProvider()
  // -------------------------------------------------------------------------

  it('returns custom provider from getActiveProvider() when aiProvider is set', async () => {
    const el = await createElement();
    const customProvider = { execute: vi.fn().mockResolvedValue('custom-result') };
    (el as any).aiProvider = customProvider;
    await el.updateComplete;

    const active = (el as any).getActiveProvider();
    expect(active).toBe(customProvider);
  });

  it('aiProvider takes precedence over attribute-based config', async () => {
    const el = await createElement({
      'ai-provider': 'anthropic',
      'ai-api-key': 'test-key',
      'ai-model': 'claude-sonnet-4-20250514',
    });
    const customProvider = { execute: vi.fn().mockResolvedValue('custom-result') };
    (el as any).aiProvider = customProvider;
    await el.updateComplete;

    const active = (el as any).getActiveProvider();
    expect(active).toBe(customProvider);
  });

  it('falls back to createProvider() when aiProvider is null', async () => {
    const el = await createElement({
      'ai-provider': 'anthropic',
      'ai-api-key': 'test-key',
      'ai-model': 'claude-sonnet-4-20250514',
    });

    const active = (el as any).getActiveProvider();
    // Should return a factory-created provider (not null)
    expect(active).toBeDefined();
    expect(active).not.toBeNull();
    // Verify it's not just the null aiProvider — it should have an execute method from the factory
    expect(typeof active.execute).toBe('function');
  });

  // -------------------------------------------------------------------------
  // Cached provider identity (getActiveProvider caching)
  // -------------------------------------------------------------------------

  it('returns the same provider instance on consecutive getActiveProvider() calls', async () => {
    const el = await createElement({
      'ai-provider': 'anthropic',
      'ai-api-key': 'test-key',
      'ai-model': 'claude-sonnet-4-20250514',
    });

    const first = (el as any).getActiveProvider();
    const second = (el as any).getActiveProvider();
    expect(first).toBe(second);
  });

  it('invalidates cached provider when an AI attribute changes', async () => {
    const el = await createElement({
      'ai-provider': 'anthropic',
      'ai-api-key': 'test-key',
      'ai-model': 'claude-sonnet-4-20250514',
    });

    const first = (el as any).getActiveProvider();
    const second = (el as any).getActiveProvider();
    // Caching: same instance before attribute change
    expect(first).toBe(second);

    el.setAttribute('ai-model', 'claude-opus-4-20250514');
    await el.updateComplete;

    const after = (el as any).getActiveProvider();
    // Invalidation: different instance after attribute change
    expect(after).not.toBe(first);
  });

  it('returns a cached provider with stable identity after custom-to-null roundtrip', async () => {
    const el = await createElement({
      'ai-provider': 'anthropic',
      'ai-api-key': 'test-key',
      'ai-model': 'claude-sonnet-4-20250514',
    });
    const customProvider = { execute: vi.fn().mockResolvedValue('custom-result') };

    // Set custom then reset to null
    (el as any).aiProvider = customProvider;
    await el.updateComplete;
    (el as any).aiProvider = null;
    await el.updateComplete;

    const first = (el as any).getActiveProvider();
    const second = (el as any).getActiveProvider();
    expect(first).toBe(second);
    expect(first).not.toBe(customProvider);
  });

  it('restores factory fallback when aiProvider is set back to null', async () => {
    const el = await createElement({
      'ai-provider': 'anthropic',
      'ai-api-key': 'test-key',
      'ai-model': 'claude-sonnet-4-20250514',
    });
    const customProvider = { execute: vi.fn().mockResolvedValue('custom-result') };

    // Set custom provider
    (el as any).aiProvider = customProvider;
    await el.updateComplete;
    expect((el as any).getActiveProvider()).toBe(customProvider);

    // Reset to null
    (el as any).aiProvider = null;
    await el.updateComplete;

    const active = (el as any).getActiveProvider();
    expect(active).not.toBe(customProvider);
    expect(active).toBeDefined();
    expect(typeof active.execute).toBe('function');
  });
});
