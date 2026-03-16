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
      'Some text\n\n<ai instruction="summarize this" />',
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

  it('does not update content when provider rejects', async () => {
    const provider: AiProvider = {
      execute: vi.fn().mockRejectedValue(new Error('provider failure')),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');
    const originalContent = editor.storage.markdown.getMarkdown();

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await vi.waitFor(() => {
      expect(provider.execute).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 50));

    // Content should remain unchanged after error
    expect(editor.storage.markdown.getMarkdown()).toBe(originalContent);
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

// ---------------------------------------------------------------------------
// Step 7: Read-only mode during execution
// ---------------------------------------------------------------------------
describe('AiExecute read-only mode', () => {
  it('sets editor to read-only during execution', async () => {
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
    expect(editor.isEditable).toBe(true);

    editor.commands.setContent('<ai instruction="test" />');
    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await new Promise((r) => setTimeout(r, 50));

    // Editor should be read-only during execution
    expect(editor.isEditable).toBe(false);

    // Resolve execution
    resolveExecution!('# Done');
    await new Promise((r) => setTimeout(r, 50));

    // Editor should be editable again after completion
    expect(editor.isEditable).toBe(true);
  });

  it('restores editable after Escape cancellation', async () => {
    const provider: AiProvider = {
      execute: vi.fn().mockReturnValue(new Promise(() => {})),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await new Promise((r) => setTimeout(r, 50));
    expect(editor.isEditable).toBe(false);

    triggerShortcut(el, 'Escape');
    await new Promise((r) => setTimeout(r, 50));

    expect(editor.isEditable).toBe(true);
  });

  it('restores editable after provider rejection', async () => {
    const provider: AiProvider = {
      execute: vi.fn().mockRejectedValue(new Error('fail')),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await vi.waitFor(() => {
      expect(provider.execute).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 50));

    expect(editor.isEditable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Step 8: onExecutionStateChange callback
// ---------------------------------------------------------------------------
describe('AiExecute onExecutionStateChange callback', () => {
  it('calls onExecutionStateChange with true at start and false on completion', async () => {
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

    const stateChanges: boolean[] = [];
    // Note: ext.options is a getter in Tiptap 3 that returns a new object
    // each call, so we override via storage instead.
    editor.storage.aiExecute.onExecutionStateChange = (executing: boolean) => {
      stateChanges.push(executing);
    };

    editor.commands.setContent('<ai instruction="test" />');
    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await new Promise((r) => setTimeout(r, 50));

    expect(stateChanges).toEqual([true]);

    resolveExecution!('# Done');
    await new Promise((r) => setTimeout(r, 50));

    expect(stateChanges).toEqual([true, false]);
  });

  it('calls onExecutionStateChange with false on Escape cancel', async () => {
    const provider: AiProvider = {
      execute: vi.fn().mockReturnValue(new Promise(() => {})),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;

    const stateChanges: boolean[] = [];
    editor.storage.aiExecute.onExecutionStateChange = (executing: boolean) => {
      stateChanges.push(executing);
    };

    editor.commands.setContent('<ai instruction="test" />');
    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await new Promise((r) => setTimeout(r, 50));

    triggerShortcut(el, 'Escape');
    await new Promise((r) => setTimeout(r, 50));

    expect(stateChanges).toEqual([true, false]);
  });

  it('calls onExecutionStateChange with false on provider error', async () => {
    const provider: AiProvider = {
      execute: vi.fn().mockRejectedValue(new Error('fail')),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;

    const stateChanges: boolean[] = [];
    editor.storage.aiExecute.onExecutionStateChange = (executing: boolean) => {
      stateChanges.push(executing);
    };

    editor.commands.setContent('<ai instruction="test" />');
    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await vi.waitFor(() => {
      expect(provider.execute).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 50));

    expect(stateChanges).toEqual([true, false]);
  });
});

// ---------------------------------------------------------------------------
// Step 9: .ai-executing CSS class toggle
// ---------------------------------------------------------------------------
describe('AiExecute .ai-executing class', () => {
  it('adds .ai-executing class to .editor div during execution', async () => {
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

    // Before execution — no class
    const editorDiv = el.shadowRoot!.querySelector('.editor')!;
    expect(editorDiv.classList.contains('ai-executing')).toBe(false);

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await new Promise((r) => setTimeout(r, 50));

    // During execution — class present
    expect(editorDiv.classList.contains('ai-executing')).toBe(true);

    resolveExecution!('# Done');
    await new Promise((r) => setTimeout(r, 50));

    // After completion — class removed
    expect(editorDiv.classList.contains('ai-executing')).toBe(false);
  });

  it('removes .ai-executing class after Escape cancellation', async () => {
    const provider: AiProvider = {
      execute: vi.fn().mockReturnValue(new Promise(() => {})),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await new Promise((r) => setTimeout(r, 50));

    const editorDiv = el.shadowRoot!.querySelector('.editor')!;
    expect(editorDiv.classList.contains('ai-executing')).toBe(true);

    triggerShortcut(el, 'Escape');
    await new Promise((r) => setTimeout(r, 50));

    expect(editorDiv.classList.contains('ai-executing')).toBe(false);
  });

  it('removes .ai-executing class after provider error', async () => {
    const provider: AiProvider = {
      execute: vi.fn().mockRejectedValue(new Error('fail')),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await vi.waitFor(() => {
      expect(provider.execute).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 50));

    const editorDiv = el.shadowRoot!.querySelector('.editor')!;
    expect(editorDiv.classList.contains('ai-executing')).toBe(false);
  });

  it('querying .editor.ai-executing returns element during execution', async () => {
    const provider: AiProvider = {
      execute: vi.fn().mockReturnValue(new Promise(() => {})),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await new Promise((r) => setTimeout(r, 50));

    // The compound selector should match during execution
    expect(el.shadowRoot!.querySelector('.editor.ai-executing')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Step 11: ai-error event emission on provider error
// ---------------------------------------------------------------------------
describe('AiExecute ai-error event', () => {
  it('emits ai-error event on provider error with correct detail', async () => {
    const providerError = new Error('provider failure');
    const provider: AiProvider = {
      execute: vi.fn().mockRejectedValue(providerError),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    const errorHandler = vi.fn();
    editor.view.dom.addEventListener('ai-error', errorHandler);

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await vi.waitFor(() => {
      expect(provider.execute).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 50));

    expect(errorHandler).toHaveBeenCalledTimes(1);
    const event = errorHandler.mock.calls[0][0] as CustomEvent;
    expect(event.detail.error).toBe(providerError);
    expect(event.detail.type).toBe('provider');
  });

  it('ai-error event bubbles and is composed', async () => {
    const provider: AiProvider = {
      execute: vi.fn().mockRejectedValue(new Error('fail')),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    const errorHandler = vi.fn();
    editor.view.dom.addEventListener('ai-error', errorHandler);

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await vi.waitFor(() => {
      expect(provider.execute).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 50));

    const event = errorHandler.mock.calls[0][0] as CustomEvent;
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
  });

  it('does NOT emit ai-error on AbortError', async () => {
    const provider: AiProvider = {
      execute: vi.fn().mockImplementation((_doc, signal) => {
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            const abortError = new DOMException('Aborted', 'AbortError');
            reject(abortError);
          });
        });
      }),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    const errorHandler = vi.fn();
    editor.view.dom.addEventListener('ai-error', errorHandler);

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await new Promise((r) => setTimeout(r, 50));

    // Cancel via Escape
    triggerShortcut(el, 'Escape');
    await new Promise((r) => setTimeout(r, 50));

    expect(errorHandler).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Step 12: onError callback
// ---------------------------------------------------------------------------
describe('AiExecute onError callback', () => {
  it('calls onError callback with error and type on provider error', async () => {
    const providerError = new Error('provider failure');
    const provider: AiProvider = {
      execute: vi.fn().mockRejectedValue(providerError),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;

    const onErrorSpy = vi.fn();
    editor.storage.aiExecute.onError = onErrorSpy;

    editor.commands.setContent('<ai instruction="test" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await vi.waitFor(() => {
      expect(provider.execute).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 50));

    expect(onErrorSpy).toHaveBeenCalledTimes(1);
    expect(onErrorSpy).toHaveBeenCalledWith(providerError, 'provider');
  });

  it('does NOT call onError on AbortError', async () => {
    const provider: AiProvider = {
      execute: vi.fn().mockImplementation((_doc, signal) => {
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      }),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;

    const onErrorSpy = vi.fn();
    editor.storage.aiExecute.onError = onErrorSpy;

    editor.commands.setContent('<ai instruction="test" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await new Promise((r) => setTimeout(r, 50));

    triggerShortcut(el, 'Escape');
    await new Promise((r) => setTimeout(r, 50));

    expect(onErrorSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Step 13: Empty response handling
// ---------------------------------------------------------------------------
describe('AiExecute empty response handling', () => {
  it('preserves editor content when provider returns empty string', async () => {
    const provider: AiProvider = {
      execute: vi.fn().mockResolvedValue(''),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');
    const originalContent = editor.storage.markdown.getMarkdown();

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await vi.waitFor(() => {
      expect(provider.execute).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 50));

    expect(editor.storage.markdown.getMarkdown()).toBe(originalContent);
  });

  it('emits ai-error with type empty-response when provider returns empty string', async () => {
    const provider: AiProvider = {
      execute: vi.fn().mockResolvedValue(''),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    const errorHandler = vi.fn();
    editor.view.dom.addEventListener('ai-error', errorHandler);

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await vi.waitFor(() => {
      expect(provider.execute).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 50));

    expect(errorHandler).toHaveBeenCalledTimes(1);
    const event = errorHandler.mock.calls[0][0] as CustomEvent;
    expect(event.detail.type).toBe('empty-response');
  });

  it('preserves editor content when provider returns whitespace-only string', async () => {
    const provider: AiProvider = {
      execute: vi.fn().mockResolvedValue('   \n\t  '),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');
    const originalContent = editor.storage.markdown.getMarkdown();

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await vi.waitFor(() => {
      expect(provider.execute).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 50));

    expect(editor.storage.markdown.getMarkdown()).toBe(originalContent);
  });

  it('restores editor editability after empty response', async () => {
    const provider: AiProvider = {
      execute: vi.fn().mockResolvedValue(''),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await vi.waitFor(() => {
      expect(provider.execute).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 50));

    expect(editor.isEditable).toBe(true);
  });

  it('calls onError with empty-response type on empty response', async () => {
    const provider: AiProvider = {
      execute: vi.fn().mockResolvedValue(''),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;

    const onErrorSpy = vi.fn();
    editor.storage.aiExecute.onError = onErrorSpy;

    editor.commands.setContent('<ai instruction="test" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await vi.waitFor(() => {
      expect(provider.execute).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 50));

    expect(onErrorSpy).toHaveBeenCalledTimes(1);
    expect(onErrorSpy.mock.calls[0][1]).toBe('empty-response');
  });
});

// ---------------------------------------------------------------------------
// Step 14: Parse error handling (invalid markdown)
// ---------------------------------------------------------------------------
describe('AiExecute parse error handling', () => {
  it('preserves editor content when AI returns content that causes a parse error', async () => {
    // This test uses a provider that returns content which will cause
    // parseMarkdown to throw (implementation will validate parsed doc)
    const provider: AiProvider = {
      execute: vi.fn().mockResolvedValue(null as any),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');
    const originalContent = editor.storage.markdown.getMarkdown();

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await vi.waitFor(() => {
      expect(provider.execute).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 50));

    expect(editor.storage.markdown.getMarkdown()).toBe(originalContent);
  });

  it('emits ai-error with type parse on parse failure', async () => {
    const provider: AiProvider = {
      execute: vi.fn().mockResolvedValue(null as any),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    const errorHandler = vi.fn();
    editor.view.dom.addEventListener('ai-error', errorHandler);

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await vi.waitFor(() => {
      expect(provider.execute).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 50));

    expect(errorHandler).toHaveBeenCalledTimes(1);
    const event = errorHandler.mock.calls[0][0] as CustomEvent;
    expect(event.detail.type).toBe('parse');
  });

  it('restores editor editability after parse error', async () => {
    const provider: AiProvider = {
      execute: vi.fn().mockResolvedValue(null as any),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await vi.waitFor(() => {
      expect(provider.execute).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 50));

    expect(editor.isEditable).toBe(true);
  });

  it('removes ai-executing class after parse error', async () => {
    const provider: AiProvider = {
      execute: vi.fn().mockResolvedValue(null as any),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await vi.waitFor(() => {
      expect(provider.execute).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 50));

    const editorDiv = el.shadowRoot!.querySelector('.editor')!;
    expect(editorDiv.classList.contains('ai-executing')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Step 10: Cleanup on disconnect during execution
// ---------------------------------------------------------------------------
describe('AiExecute disconnect cleanup', () => {
  it('cleans up visual state when disconnected during execution and reconnected', async () => {
    const provider: AiProvider = {
      execute: vi.fn().mockReturnValue(new Promise(() => {})),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await new Promise((r) => setTimeout(r, 50));

    // Disconnect element mid-execution
    document.body.removeChild(el);
    await new Promise((r) => setTimeout(r, 50));

    // Reconnect element
    document.body.appendChild(el);
    await el.updateComplete;

    // Editor should be editable after reconnect
    const newEditor = (el as any)._editor!;
    expect(newEditor.isEditable).toBe(true);

    // .ai-executing class should be absent
    const editorDiv = el.shadowRoot!.querySelector('.editor');
    expect(editorDiv).not.toBeNull();
    expect(editorDiv!.classList.contains('ai-executing')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Success feedback: visual confirmation after AI completion
// ---------------------------------------------------------------------------
describe('AiExecute success feedback', () => {
  it('shows success toast after successful AI execution', async () => {
    const provider = mockProvider('# AI Result');
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await vi.waitFor(() => {
      expect(provider.execute).toHaveBeenCalled();
    });
    // Wait for execution + completion sequence (~300ms animation fallback + buffer)
    await new Promise((r) => setTimeout(r, 500));
    await el.updateComplete;

    const toast = el.shadowRoot!.querySelector('.ai-success-toast');
    expect(toast).not.toBeNull();
  });

  it('auto-dismisses success toast after 2 seconds', async () => {
    vi.useFakeTimers();

    const provider = mockProvider('# AI Result');
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    // Advance past execution + completion sequence
    await vi.advanceTimersByTimeAsync(500);
    await el.updateComplete;

    // Toast should be visible
    expect(el.shadowRoot!.querySelector('.ai-success-toast')).not.toBeNull();

    // Advance past 2-second auto-dismiss
    await vi.advanceTimersByTimeAsync(2000);
    await el.updateComplete;

    // Toast should be gone
    expect(el.shadowRoot!.querySelector('.ai-success-toast')).toBeNull();

    vi.useRealTimers();
  });

  it('adds .ai-completing class to .editor div on completion', async () => {
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

    // Resolve the provider — triggers completion sequence
    resolveExecution!('# Done');
    await new Promise((r) => setTimeout(r, 50));

    const editorDiv = el.shadowRoot!.querySelector('.editor')!;
    expect(editorDiv.classList.contains('ai-completing')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Success feedback: negative paths and cleanup
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Step 5 coverage: default getProvider throws, duplicate execution no-op,
// parseMarkdown throw path
// ---------------------------------------------------------------------------
describe('AiExecute default getProvider', () => {
  it('default getProvider throws when no provider configured and execute shortcut triggers', async () => {
    // Test the AiExecute extension's default getProvider option directly
    // (not via component, which wires its own getActiveProvider).
    // Import the extension and verify its default option throws.
    const { AiExecute } = await import('../extensions/ai-execute.js');
    const defaultOptions = AiExecute.options;
    expect(() => defaultOptions.getProvider()).toThrow(
      'AiExecute: getProvider not configured',
    );
  });
});

describe('AiExecute shortcut while execution in progress', () => {
  it('pressing execute shortcut while execution in progress is a no-op', async () => {
    // Provider that never resolves (simulates in-flight request)
    const provider: AiProvider = {
      execute: vi.fn().mockReturnValue(new Promise(() => {})),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    // First trigger — starts execution
    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await new Promise((r) => setTimeout(r, 50));

    expect(provider.execute).toHaveBeenCalledTimes(1);
    expect(editor.storage.aiExecute.abortController).not.toBeNull();

    // Second trigger — should be a no-op because abortController is already set
    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await new Promise((r) => setTimeout(r, 50));

    // Still only one call
    expect(provider.execute).toHaveBeenCalledTimes(1);
  });
});

describe('AiExecute parseMarkdown throw path', () => {
  it('when parseMarkdown throws, editor restored to editable, ai-error emitted with type parse, onError called', async () => {
    // Provider returns valid string that will pass the typeof/empty checks
    // but will cause parseMarkdown to throw internally.
    // We achieve this by mocking parseMarkdown to throw.
    const provider: AiProvider = {
      execute: vi.fn().mockResolvedValue('# Valid markdown'),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    // Override parseMarkdown to throw via intercepting at the editor level
    // We'll monkey-patch the markdown parser to throw
    const originalParse = editor.storage.markdown.parser.parse;
    editor.storage.markdown.parser.parse = () => {
      throw new Error('parseMarkdown test error');
    };

    const errorHandler = vi.fn();
    editor.view.dom.addEventListener('ai-error', errorHandler);

    const onErrorSpy = vi.fn();
    editor.storage.aiExecute.onError = onErrorSpy;

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await vi.waitFor(() => {
      expect(provider.execute).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 50));

    // Editor should be restored to editable
    expect(editor.isEditable).toBe(true);

    // ai-error event should be emitted with type 'parse'
    expect(errorHandler).toHaveBeenCalledTimes(1);
    const event = errorHandler.mock.calls[0][0] as CustomEvent;
    expect(event.detail.type).toBe('parse');
    expect(event.detail.error.message).toBe('parseMarkdown test error');

    // onError should be called with the error and type 'parse'
    expect(onErrorSpy).toHaveBeenCalledTimes(1);
    expect(onErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'parseMarkdown test error' }),
      'parse',
    );

    // Restore original
    editor.storage.markdown.parser.parse = originalParse;
  });
});

describe('AiExecute success feedback negative paths', () => {
  it('does NOT show success toast after provider error', async () => {
    const provider: AiProvider = {
      execute: vi.fn().mockRejectedValue(new Error('provider failure')),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await vi.waitFor(() => {
      expect(provider.execute).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 500));
    await el.updateComplete;

    const toast = el.shadowRoot!.querySelector('.ai-success-toast');
    expect(toast).toBeNull();
  });

  it('does NOT show success toast after Escape cancellation', async () => {
    const provider: AiProvider = {
      execute: vi.fn().mockReturnValue(new Promise(() => {})),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await new Promise((r) => setTimeout(r, 50));

    triggerShortcut(el, 'Escape');
    await new Promise((r) => setTimeout(r, 500));
    await el.updateComplete;

    const toast = el.shadowRoot!.querySelector('.ai-success-toast');
    expect(toast).toBeNull();
  });

  it('cleans up success toast timer on disconnectedCallback', async () => {
    vi.useFakeTimers();

    const provider = mockProvider('# AI Result');
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    // Advance past execution + completion sequence to show toast
    await vi.advanceTimersByTimeAsync(500);
    await el.updateComplete;

    // Toast should be visible
    expect(el.shadowRoot!.querySelector('.ai-success-toast')).not.toBeNull();

    // Disconnect element — should clean up timer without errors
    document.body.removeChild(el);
    await vi.advanceTimersByTimeAsync(3000);

    // No errors thrown — timer was properly cleaned up
    vi.useRealTimers();
  });
});
