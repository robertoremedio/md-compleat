import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { MdCompleat } from '../md-compleat.js';
import type { AiProvider } from '../ai/provider.js';

/**
 * Helper: create a component, attach to DOM, and wait for Lit's updateComplete.
 */
async function createElement(
  attributes: Record<string, string> = {},
): Promise<MdCompleat> {
  const el = document.createElement('md-compleat') as MdCompleat;
  for (const [key, value] of Object.entries(attributes)) {
    el.setAttribute(key, value);
  }
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

/**
 * Helper: create a mock AiProvider.
 */
function mockProvider(result = '# AI Response'): AiProvider {
  return {
    execute: vi.fn().mockResolvedValue(result),
  };
}

/**
 * Helper: simulate a keyboard shortcut on the editor.
 */
function triggerShortcut(
  el: MdCompleat,
  key: string,
  modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } = {},
) {
  const editor = (el as any)._editor!;
  const editorEl = editor.view.dom as HTMLElement;
  editorEl.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...modifiers,
    }),
  );
}

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Step 1: Extension registration and options
// ---------------------------------------------------------------------------
describe('AiExecute extension registration', () => {
  it('registers aiExecute extension in the editor', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    const names = editor.extensionManager.extensions.map(
      (ext: any) => ext.name,
    );
    expect(names).toContain('aiExecute');
  });

  it('uses default Mod-Enter shortcut', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    const ext = editor.extensionManager.extensions.find(
      (e: any) => e.name === 'aiExecute',
    );
    expect(ext).toBeDefined();
    expect(ext.options.shortcut).toBe('Mod-Enter');
  });

  it('accepts a custom shortcut via ai-execute-shortcut attribute', async () => {
    const el = await createElement({
      'ai-execute-shortcut': 'Mod-Shift-Enter',
    });
    const editor = (el as any)._editor!;
    const ext = editor.extensionManager.extensions.find(
      (e: any) => e.name === 'aiExecute',
    );
    expect(ext).toBeDefined();
    expect(ext.options.shortcut).toBe('Mod-Shift-Enter');
  });

  it('receives a getProvider callback option', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    const ext = editor.extensionManager.extensions.find(
      (e: any) => e.name === 'aiExecute',
    );
    expect(ext.options.getProvider).toBeTypeOf('function');
  });
});

// ---------------------------------------------------------------------------
// Step 3: Document scanning — no-op when no AI directives
// ---------------------------------------------------------------------------
describe('AiExecute no-op without directives', () => {
  it('does not call provider when document has no AI directives', async () => {
    const provider = mockProvider();
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<p>Hello world</p>');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await new Promise((r) => setTimeout(r, 50));

    expect(provider.execute).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Step 4: Execution pipeline — serialize and call provider
// ---------------------------------------------------------------------------
describe('AiExecute execution pipeline', () => {
  it('calls provider.execute with serialized markdown when directives exist', async () => {
    const provider = mockProvider();
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent(
      '<p>Some text</p><ai instruction="summarize this" />',
    );

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await new Promise((r) => setTimeout(r, 50));

    expect(provider.execute).toHaveBeenCalledTimes(1);
    const [markdown, signal] = (provider.execute as ReturnType<typeof vi.fn>)
      .mock.calls[0];
    expect(markdown).toContain('summarize this');
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it('replaces editor content with provider result', async () => {
    const provider = mockProvider('# Result from AI');
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="do something" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    // Wait for the async execution to complete
    await vi.waitFor(() => {
      expect(provider.execute).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 50));

    const content = editor.storage.markdown.getMarkdown();
    expect(content).toContain('Result from AI');
  });

  it('prevents duplicate execution while request is in-flight', async () => {
    // Provider that never resolves (simulates in-flight request)
    const provider: AiProvider = {
      execute: vi.fn().mockReturnValue(new Promise(() => {})),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    // Trigger twice rapidly
    triggerShortcut(el, 'Enter', { ctrlKey: true });
    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await new Promise((r) => setTimeout(r, 50));

    expect(provider.execute).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Step 5: Escape key cancellation
// ---------------------------------------------------------------------------
describe('AiExecute Escape cancellation', () => {
  it('aborts in-flight request when Escape is pressed', async () => {
    let capturedSignal: AbortSignal | undefined;
    const provider: AiProvider = {
      execute: vi.fn().mockImplementation((_doc, signal) => {
        capturedSignal = signal;
        return new Promise(() => {}); // Never resolves
      }),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await new Promise((r) => setTimeout(r, 50));

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal!.aborted).toBe(false);

    triggerShortcut(el, 'Escape');
    await new Promise((r) => setTimeout(r, 50));

    expect(capturedSignal!.aborted).toBe(true);
  });

  it('Escape passes through when no request is in-flight', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    editor.commands.setContent('<p>Hello</p>');

    // Escape should not be consumed (handler returns false)
    // We verify by checking the editor's storage has no abortController
    const storage = editor.storage.aiExecute;
    expect(storage?.abortController).toBeNull();

    // Escape should not throw or cause issues
    triggerShortcut(el, 'Escape');
  });

  it('allows new execution after cancellation', async () => {
    let callCount = 0;
    const provider: AiProvider = {
      execute: vi.fn().mockImplementation((_doc, signal) => {
        callCount++;
        if (callCount === 1) {
          return new Promise(() => {}); // First call never resolves
        }
        return Promise.resolve('# Second result');
      }),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    // First execution
    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await new Promise((r) => setTimeout(r, 50));

    // Cancel
    triggerShortcut(el, 'Escape');
    await new Promise((r) => setTimeout(r, 50));

    // Second execution should work
    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await new Promise((r) => setTimeout(r, 50));

    expect(provider.execute).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Step 6: Lifecycle and edge cases
// ---------------------------------------------------------------------------
describe('AiExecute lifecycle', () => {
  it('does not throw when editor is destroyed before execution completes', async () => {
    let resolveExecution: (value: string) => void;
    const provider: AiProvider = {
      execute: vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveExecution = resolve;
          }),
      ),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await new Promise((r) => setTimeout(r, 50));

    // Destroy the editor while execution is in-flight
    document.body.removeChild(el);
    await new Promise((r) => setTimeout(r, 50));

    // Resolve the execution — should not throw
    expect(() => resolveExecution!('# Result')).not.toThrow();
  });

  it('disconnectedCallback aborts in-flight request', async () => {
    let capturedSignal: AbortSignal | undefined;
    const provider: AiProvider = {
      execute: vi.fn().mockImplementation((_doc, signal) => {
        capturedSignal = signal;
        return new Promise(() => {});
      }),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await new Promise((r) => setTimeout(r, 50));

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal!.aborted).toBe(false);

    // Remove element from DOM — triggers disconnectedCallback
    document.body.removeChild(el);
    await new Promise((r) => setTimeout(r, 50));

    expect(capturedSignal!.aborted).toBe(true);
  });
});
