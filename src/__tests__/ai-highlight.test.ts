import { describe, it, expect, vi, afterEach } from 'vitest';
import { MdCompleat } from '../md-compleat.js';

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

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Step 1: AiHighlight mark extension
// ---------------------------------------------------------------------------
describe('AiHighlight mark extension', () => {
  it('registers aiHighlight extension in the editor', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    const names = editor.extensionManager.extensions.map(
      (ext: any) => ext.name,
    );
    expect(names).toContain('aiHighlight');
  });

  it('renders as <mark data-ai-highlight> element', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    // Set content with text, then apply the aiHighlight mark programmatically
    editor.commands.setContent('<p>Hello world</p>');

    // Apply aiHighlight mark to "Hello"
    const tr = editor.state.tr;
    const markType = editor.schema.marks.aiHighlight;
    expect(markType).toBeDefined();
    tr.addMark(0, 6, markType.create());
    editor.view.dispatch(tr);

    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror');
    const mark = proseMirror?.querySelector('mark[data-ai-highlight]');
    expect(mark).not.toBeNull();
  });

  it('is excluded from getMarkdown() output', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    editor.commands.setContent('<p>Hello world</p>');

    // Apply aiHighlight mark to "Hello"
    const tr = editor.state.tr;
    const markType = editor.schema.marks.aiHighlight;
    tr.addMark(1, 6, markType.create());
    tr.setMeta('aiReplacement', true);
    editor.view.dispatch(tr);

    const markdown = editor.storage.markdown.getMarkdown();
    // The mark should not produce any markdown syntax
    expect(markdown.trim()).toBe('Hello world');
  });

  it('strips aiHighlight marks after a user edit', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    editor.commands.setContent('<p>Hello world</p>');

    // Apply aiHighlight mark
    const tr = editor.state.tr;
    const markType = editor.schema.marks.aiHighlight;
    tr.addMark(1, 6, markType.create());
    tr.setMeta('aiReplacement', true);
    editor.view.dispatch(tr);

    // Verify mark exists
    let hasHighlight = false;
    editor.state.doc.descendants((node: any) => {
      if (node.marks?.some((m: any) => m.type.name === 'aiHighlight')) {
        hasHighlight = true;
      }
    });
    expect(hasHighlight).toBe(true);

    // Simulate user edit (insertText without aiReplacement meta)
    editor.commands.insertContentAt(editor.state.doc.content.size - 1, '!');

    // After user edit, all aiHighlight marks should be removed
    hasHighlight = false;
    editor.state.doc.descendants((node: any) => {
      if (node.marks?.some((m: any) => m.type.name === 'aiHighlight')) {
        hasHighlight = true;
      }
    });
    expect(hasHighlight).toBe(false);
  });

  it('preserves aiHighlight marks during programmatic aiReplacement transactions', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    editor.commands.setContent('<p>Hello world</p>');

    // Apply aiHighlight mark with aiReplacement meta
    const tr = editor.state.tr;
    const markType = editor.schema.marks.aiHighlight;
    tr.addMark(1, 6, markType.create());
    tr.setMeta('aiReplacement', true);
    editor.view.dispatch(tr);

    // Dispatch another transaction with aiReplacement meta
    const tr2 = editor.state.tr;
    tr2.insertText(' extra', editor.state.doc.content.size - 1);
    tr2.setMeta('aiReplacement', true);
    editor.view.dispatch(tr2);

    // aiHighlight marks should still be present
    let hasHighlight = false;
    editor.state.doc.descendants((node: any) => {
      if (node.marks?.some((m: any) => m.type.name === 'aiHighlight')) {
        hasHighlight = true;
      }
    });
    expect(hasHighlight).toBe(true);
  });
});
