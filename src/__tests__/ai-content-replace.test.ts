import { describe, it, expect, vi, afterEach } from 'vitest';
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

/**
 * Helper: wait for AI execution to complete.
 */
async function waitForExecution(provider: AiProvider) {
  await vi.waitFor(() => {
    expect(provider.execute).toHaveBeenCalled();
  });
  await new Promise((r) => setTimeout(r, 50));
}

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Step 4: Replacement pipeline — content replacement with highlights
// ---------------------------------------------------------------------------
describe('AiExecute content replacement pipeline', () => {
  it('replaces editor content with AI response', async () => {
    const provider = mockProvider('# Result from AI\n\nNew paragraph here.');
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="rewrite this" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await waitForExecution(provider);

    const content = editor.storage.markdown.getMarkdown();
    expect(content).toContain('Result from AI');
    expect(content).toContain('New paragraph here');
  });

  it('removes AI directive tags from the result', async () => {
    const provider = mockProvider('Clean content without any AI tags.');
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent(
      '<p>Some text</p><ai instruction="summarize" />',
    );

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await waitForExecution(provider);

    // AI directive nodes should be gone from the document
    let hasDirective = false;
    editor.state.doc.descendants((node: any) => {
      if (node.type.name === 'aiDirective') {
        hasDirective = true;
      }
    });
    expect(hasDirective).toBe(false);
  });

  it('applies aiHighlight marks to changed regions', async () => {
    const provider = mockProvider('Hello earth');
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent(
      '<p>Hello world</p><ai instruction="change world to earth" />',
    );

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await waitForExecution(provider);

    // Should have aiHighlight marks on changed regions
    let hasHighlight = false;
    editor.state.doc.descendants((node: any) => {
      if (node.marks?.some((m: any) => m.type.name === 'aiHighlight')) {
        hasHighlight = true;
      }
    });
    expect(hasHighlight).toBe(true);
  });

  it('emits ai-completed event with duration and charactersChanged', async () => {
    const provider = mockProvider('# Completely new content');
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="rewrite" />');

    const eventPromise = new Promise<CustomEvent>((resolve) => {
      editor.view.dom.addEventListener('ai-completed', (e: Event) => {
        resolve(e as CustomEvent);
      });
    });

    triggerShortcut(el, 'Enter', { ctrlKey: true });

    const event = await eventPromise;
    expect(event.detail).toBeDefined();
    expect(event.detail.duration).toBeGreaterThan(0);
    expect(typeof event.detail.charactersChanged).toBe('number');
  });

  it('ai-completed event bubbles and is composed (crosses shadow DOM)', async () => {
    const provider = mockProvider('# New content');
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="rewrite" />');

    const eventPromise = new Promise<CustomEvent>((resolve) => {
      el.addEventListener('ai-completed', (e: Event) => {
        resolve(e as CustomEvent);
      });
    });

    triggerShortcut(el, 'Enter', { ctrlKey: true });

    const event = await eventPromise;
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Step 5: Single-step undo and integration
// ---------------------------------------------------------------------------
describe('AiExecute single-step undo', () => {
  it('restores original document including AI tags with a single undo', async () => {
    const provider = mockProvider('# Clean result without directives');
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent(
      '<p>Original text</p><ai instruction="do something" />',
    );
    const originalDoc = editor.state.doc.toJSON();

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await waitForExecution(provider);

    // Content should be replaced
    const replacedContent = editor.storage.markdown.getMarkdown();
    expect(replacedContent).toContain('Clean result');

    // Single undo should restore original
    editor.commands.undo();

    const restoredDoc = editor.state.doc.toJSON();
    expect(restoredDoc).toEqual(originalDoc);
  });

  it('second undo does not change document further (single history entry)', async () => {
    const provider = mockProvider('# New content');
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent(
      '<p>Original</p><ai instruction="test" />',
    );

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await waitForExecution(provider);

    // First undo — restores original
    editor.commands.undo();
    const afterFirstUndo = editor.state.doc.toJSON();

    // Second undo — should not change anything further
    editor.commands.undo();
    const afterSecondUndo = editor.state.doc.toJSON();

    expect(afterSecondUndo).toEqual(afterFirstUndo);
  });

  it('highlight marks are gone after undo (original had none)', async () => {
    const provider = mockProvider('Modified content');
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent(
      '<p>Original text</p><ai instruction="modify" />',
    );

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await waitForExecution(provider);

    // Undo
    editor.commands.undo();

    // No highlight marks should remain
    let hasHighlight = false;
    editor.state.doc.descendants((node: any) => {
      if (node.marks?.some((m: any) => m.type.name === 'aiHighlight')) {
        hasHighlight = true;
      }
    });
    expect(hasHighlight).toBe(false);
  });

  it('full round-trip: replace → highlights → user edit removes highlights → undo restores original', async () => {
    const provider = mockProvider('Hello earth');
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent(
      '<p>Hello world</p><ai instruction="change world to earth" />',
    );
    const originalDoc = editor.state.doc.toJSON();

    // 1. Trigger AI execution
    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await waitForExecution(provider);

    // 2. Verify replacement happened and highlights are present
    const markdown = editor.storage.markdown.getMarkdown();
    expect(markdown).toContain('earth');

    let hasHighlight = false;
    editor.state.doc.descendants((node: any) => {
      if (node.marks?.some((m: any) => m.type.name === 'aiHighlight')) {
        hasHighlight = true;
      }
    });
    expect(hasHighlight).toBe(true);

    // 3. User types a character — highlights should be removed
    editor.commands.insertContentAt(editor.state.doc.content.size - 1, '!');

    hasHighlight = false;
    editor.state.doc.descendants((node: any) => {
      if (node.marks?.some((m: any) => m.type.name === 'aiHighlight')) {
        hasHighlight = true;
      }
    });
    expect(hasHighlight).toBe(false);

    // 4. Undo twice (user edit + AI replacement) to restore original
    editor.commands.undo(); // undo user edit
    editor.commands.undo(); // undo AI replacement

    const restoredDoc = editor.state.doc.toJSON();
    expect(restoredDoc).toEqual(originalDoc);
  });
});

// ---------------------------------------------------------------------------
// Step 6: AiHighlight CSS in shadow DOM
// ---------------------------------------------------------------------------
describe('AiHighlight in rendered shadow DOM', () => {
  it('highlight marks appear in shadow DOM after AI execution', async () => {
    const provider = mockProvider('Completely new content');
    const el = await createElement();
    el.aiProvider = provider;
    await el.updateComplete;

    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="rewrite everything" />');

    triggerShortcut(el, 'Enter', { ctrlKey: true });
    await waitForExecution(provider);

    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror');
    const highlightMarks = proseMirror?.querySelectorAll(
      'mark[data-ai-highlight]',
    );
    expect(highlightMarks?.length).toBeGreaterThan(0);
  });
});
