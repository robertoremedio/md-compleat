import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

// Import the component — this will fail until src/md-compleat.ts exists
import { MdCompleat } from '../md-compleat.js';
import type { AiProvider } from '../ai/provider.js';

/**
 * Helper: create a component, attach to DOM, and wait for Lit's updateComplete.
 */
async function createElement(attributes: Record<string, string> = {}): Promise<MdCompleat> {
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
  vi.useRealTimers();
  // Clean up any elements added to the DOM
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Step 2: Component renders and registers as custom element
// ---------------------------------------------------------------------------
describe('component registration', () => {
  it('creates an instance of MdCompleat via document.createElement', async () => {
    const el = document.createElement('md-compleat');
    expect(el).toBeInstanceOf(MdCompleat);
  });

  it('has a shadow root after connecting to the DOM', async () => {
    const el = await createElement();
    expect(el.shadowRoot).not.toBeNull();
  });

  it('renders a .editor container inside shadow DOM', async () => {
    const el = await createElement();
    const editorDiv = el.shadowRoot!.querySelector('.editor');
    expect(editorDiv).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Step 3: Tiptap editor initialization in shadow DOM
// ---------------------------------------------------------------------------
describe('tiptap editor initialization', () => {
  it('mounts a ProseMirror instance inside .editor after firstUpdated', async () => {
    const el = await createElement();
    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror');
    expect(proseMirror).not.toBeNull();
  });

  it('ProseMirror element is contenteditable', async () => {
    const el = await createElement();
    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror');
    expect(proseMirror?.getAttribute('contenteditable')).toBe('true');
  });

  it('destroys editor when removed from DOM', async () => {
    const el = await createElement();
    // Confirm editor exists
    expect(el.shadowRoot!.querySelector('.ProseMirror')).not.toBeNull();

    // Remove from DOM
    el.remove();

    // After disconnect, editor should be destroyed
    // Re-query: the .ProseMirror element should be gone or the editor nullified
    // We check the public-facing symptom: no ProseMirror child
    expect(el.shadowRoot!.querySelector('.ProseMirror')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Step 4: content property and attribute
// ---------------------------------------------------------------------------
describe('content property', () => {
  it('accepts content as an attribute and renders it in the editor', async () => {
    const el = await createElement({ content: '<p>Hello</p>' });
    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror');
    expect(proseMirror?.textContent).toContain('Hello');
  });

  it('accepts content as a property and renders it in the editor', async () => {
    const el = await createElement();
    el.content = '<p>Set via property</p>';
    await el.updateComplete;
    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror');
    expect(proseMirror?.textContent).toContain('Set via property');
  });

  it('updates editor content when property changes after mount', async () => {
    const el = await createElement({ content: '<p>Initial</p>' });
    expect(el.shadowRoot!.querySelector('.ProseMirror')?.textContent).toContain('Initial');

    el.content = '<p>Updated</p>';
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.ProseMirror')?.textContent).toContain('Updated');
  });

  it('defaults content to empty string', async () => {
    const el = await createElement();
    expect(el.content).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Step 5: content-changed event
// ---------------------------------------------------------------------------
describe('content-changed event', () => {
  it('emits content-changed when editor content changes', async () => {
    const el = await createElement();
    const handler = vi.fn();
    el.addEventListener('content-changed', handler);

    // Simulate editor content change via Tiptap commands
    // Access the internal editor to trigger an update
    (el as any)._editor?.commands.setContent('<p>New content</p>');

    // Allow async event dispatch
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(handler).toHaveBeenCalled();
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail.content).toContain('New content');
  });

  it('content-changed event bubbles and is composed', async () => {
    const el = await createElement();
    const handler = vi.fn();
    // Listen on document to verify bubbling + composed
    document.addEventListener('content-changed', handler);

    (el as any)._editor?.commands.setContent('<p>Bubbles</p>');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(handler).toHaveBeenCalled();
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);

    document.removeEventListener('content-changed', handler);
  });

  it('does NOT emit content-changed when content is set externally via property', async () => {
    const el = await createElement();
    const handler = vi.fn();
    el.addEventListener('content-changed', handler);

    // Setting content externally should NOT trigger the event
    el.content = '<p>External update</p>';
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(handler).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Step 6: _updatingFromEditor race condition fix
// ---------------------------------------------------------------------------
describe('editor-originated update does not redundantly call setContent', () => {
  it('_updatingFromEditor is still true when updated() processes an editor-originated content change', async () => {
    const el = await createElement();

    // Capture the flag value at the moment updated() runs
    const flagValues: boolean[] = [];
    const originalUpdated = el.updated.bind(el);
    el.updated = (changedProperties: Map<string, unknown>) => {
      if (changedProperties.has('content')) {
        flagValues.push((el as any)._updatingFromEditor);
      }
      originalUpdated(changedProperties);
    };

    // Simulate editor-originated content change
    const editor = (el as any)._editor!;
    editor.commands.setContent('<p>User typed this</p>');

    // Wait for Lit's reactive update cycle
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    // The flag should have been true when updated() ran, proving the
    // flag survived the async gap between onUpdate and updated().
    // BUG: with current code, _updatingFromEditor is reset to false
    // synchronously in onUpdate before Lit's updated() runs.
    expect(flagValues).toContain(true);
  });

  it('resets _updatingFromEditor to false after updated() processes it', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    // Trigger editor-originated update
    editor.commands.setContent('<p>Editor change</p>');
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Flag should be reset to false after updated() processed it,
    // so subsequent external changes still flow through to setContent.
    // BUG: with current code the flag is reset in onUpdate not updated(),
    // so this test passes vacuously — but it will verify correct behavior
    // after the fix moves the reset into updated().
    expect((el as any)._updatingFromEditor).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Step 7: Base styles
// ---------------------------------------------------------------------------
describe('base styles', () => {
  it('host element has display: block', async () => {
    const el = await createElement();
    expect(getComputedStyle(el).display).toBe('block');
  });

  it('renders .editor container in shadow DOM', async () => {
    const el = await createElement();
    const editorDiv = el.shadowRoot!.querySelector('.editor');
    expect(editorDiv).toBeInstanceOf(HTMLDivElement);
  });
});

// ---------------------------------------------------------------------------
// Step 8: Error toast UI
// ---------------------------------------------------------------------------
describe('error toast', () => {
  it('shows error toast in shadow DOM after provider error', async () => {
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
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;

    const toast = el.shadowRoot!.querySelector('.ai-error-toast');
    expect(toast).not.toBeNull();
    expect(toast!.textContent).toContain('provider failure');
  });

  it('auto-dismisses error toast after 5 seconds', async () => {
    vi.useFakeTimers();

    const provider: AiProvider = {
      execute: vi.fn().mockRejectedValue(new Error('timeout error')),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    // Flush microtasks for the rejected promise
    await vi.advanceTimersByTimeAsync(100);
    await el.updateComplete;

    // Toast should be visible
    expect(el.shadowRoot!.querySelector('.ai-error-toast')).not.toBeNull();

    // Advance past 5 seconds
    await vi.advanceTimersByTimeAsync(5000);
    await el.updateComplete;

    // Toast should be gone
    expect(el.shadowRoot!.querySelector('.ai-error-toast')).toBeNull();
  });

  it('shows toast for empty response error', async () => {
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
    await el.updateComplete;

    const toast = el.shadowRoot!.querySelector('.ai-error-toast');
    expect(toast).not.toBeNull();
  });

  it('shows toast for parse error', async () => {
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
    await el.updateComplete;

    const toast = el.shadowRoot!.querySelector('.ai-error-toast');
    expect(toast).not.toBeNull();
  });

  it('does NOT show toast on AbortError (user cancel)', async () => {
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
    editor.commands.setContent('<ai instruction="test" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await new Promise((r) => setTimeout(r, 50));

    triggerShortcut(el, 'Escape');
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;

    const toast = el.shadowRoot!.querySelector('.ai-error-toast');
    expect(toast).toBeNull();
  });

  it('cleans up toast timer on disconnectedCallback', async () => {
    vi.useFakeTimers();

    const provider: AiProvider = {
      execute: vi.fn().mockRejectedValue(new Error('fail')),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await vi.advanceTimersByTimeAsync(100);
    await el.updateComplete;

    // Toast should be showing
    expect(el.shadowRoot!.querySelector('.ai-error-toast')).not.toBeNull();

    // Disconnect — should clean up timer without errors
    document.body.removeChild(el);

    // Advancing timers should not throw
    expect(() => vi.advanceTimersByTimeAsync(5000)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Step 8 coverage: Mod-k on existing link, _handleEscapeCancel,
// getMarkdown() before init, rapid successive errors
// ---------------------------------------------------------------------------
describe('Mod-k link editing', () => {
  let promptSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    promptSpy = vi.spyOn(window, 'prompt');
  });

  afterEach(() => {
    promptSpy.mockRestore();
  });

  it('cancel prompt on existing link leaves link unchanged', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    // Set content with text, then programmatically add a link mark
    editor.commands.setContent('click me');
    // Select all text and set link
    editor.commands.setTextSelection({ from: 1, to: 9 });
    editor.commands.setLink({ href: 'https://example.com' });
    await el.updateComplete;

    // Place cursor inside the link (collapsed selection)
    editor.commands.setTextSelection(3);

    // Verify link is active
    expect(editor.isActive('link')).toBe(true);

    // prompt returns null (cancelled)
    promptSpy.mockReturnValue(null);

    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror') as HTMLElement;
    proseMirror.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      }),
    );
    await el.updateComplete;

    // Link should still be there with original href
    const attrs = editor.getAttributes('link');
    expect(attrs.href).toBe('https://example.com');
  });

  it('entering new URL on existing link updates href', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    // Set content with text, then programmatically add a link mark
    editor.commands.setContent('click me');
    editor.commands.setTextSelection({ from: 1, to: 9 });
    editor.commands.setLink({ href: 'https://old.com' });
    await el.updateComplete;

    // Place cursor inside the link (collapsed selection)
    editor.commands.setTextSelection(3);
    expect(editor.isActive('link')).toBe(true);

    // prompt returns a new URL
    promptSpy.mockReturnValue('https://new.com');

    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror') as HTMLElement;
    proseMirror.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      }),
    );
    await el.updateComplete;

    const attrs = editor.getAttributes('link');
    expect(attrs.href).toBe('https://new.com');
  });
});

describe('_handleEscapeCancel via document keydown', () => {
  it('pressing Escape via document during AI execution aborts and restores state', async () => {
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

    // Verify execution is in progress
    expect(editor.isEditable).toBe(false);
    const editorDiv = el.shadowRoot!.querySelector('.editor')!;
    expect(editorDiv.classList.contains('ai-executing')).toBe(true);

    // Press Escape via document (the _handleEscapeCancel path)
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(escapeEvent);
    await new Promise((r) => setTimeout(r, 50));

    // Editor should be restored
    expect(editor.isEditable).toBe(true);
    expect(editorDiv.classList.contains('ai-executing')).toBe(false);
  });
});

describe('getMarkdown() before editor init', () => {
  it('returns empty string before editor is initialized', () => {
    // Create element without appending to DOM (no firstUpdated)
    const el = document.createElement('md-compleat') as MdCompleat;
    expect(el.getMarkdown()).toBe('');
  });
});

describe('rapid successive AI errors', () => {
  it('second error replaces first toast message', async () => {
    // First error
    const provider1: AiProvider = {
      execute: vi.fn().mockRejectedValue(new Error('first error')),
    };
    const el = await createElement();
    el.aiProvider = provider1;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await vi.waitFor(() => {
      expect(provider1.execute).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;

    let toast = el.shadowRoot!.querySelector('.ai-error-toast');
    expect(toast).not.toBeNull();
    expect(toast!.textContent).toContain('first error');

    // Second error — switch to a new provider that also fails
    const provider2: AiProvider = {
      execute: vi.fn().mockRejectedValue(new Error('second error')),
    };
    el.aiProvider = provider2;
    await el.updateComplete;

    // Need to re-add directive content since it was replaced
    editor.commands.setContent('<ai instruction="test2" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await vi.waitFor(() => {
      expect(provider2.execute).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;

    // Second toast should replace first
    toast = el.shadowRoot!.querySelector('.ai-error-toast');
    expect(toast).not.toBeNull();
    expect(toast!.textContent).toContain('second error');

    // There should only be one toast element
    const toasts = el.shadowRoot!.querySelectorAll('.ai-error-toast');
    expect(toasts.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Step 9: ai-error event on component
// ---------------------------------------------------------------------------
describe('ai-error event on component', () => {
  it('emits ai-error event that crosses shadow DOM boundary', async () => {
    const provider: AiProvider = {
      execute: vi.fn().mockRejectedValue(new Error('provider failure')),
    };
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');

    const errorHandler = vi.fn();
    // Listen on the host element (outside shadow DOM)
    el.addEventListener('ai-error', errorHandler);

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await vi.waitFor(() => {
      expect(provider.execute).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 50));

    expect(errorHandler).toHaveBeenCalledTimes(1);
    const event = errorHandler.mock.calls[0][0] as CustomEvent;
    expect(event.detail.error).toBeInstanceOf(Error);
    expect(event.detail.type).toBe('provider');
  });
});
