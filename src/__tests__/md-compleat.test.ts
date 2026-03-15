import { describe, it, expect, vi, afterEach } from 'vitest';

// Import the component — this will fail until src/md-compleat.ts exists
import { MdCompleat } from '../md-compleat.js';

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

afterEach(() => {
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
