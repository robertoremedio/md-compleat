import { describe, it, expect, afterEach } from 'vitest';
import { MdCompleat } from '../md-compleat.js';
import { parseMarkdown } from '../ai/parse-markdown.js';

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
// Step 2: parseMarkdown utility
// ---------------------------------------------------------------------------
describe('parseMarkdown utility', () => {
  it('returns a valid ProseMirror doc node from simple markdown', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    const doc = parseMarkdown(editor, '# Hello World');

    expect(doc).toBeDefined();
    expect(doc.type.name).toBe('doc');
    // Should contain a heading node
    let hasHeading = false;
    doc.descendants((node: any) => {
      if (node.type.name === 'heading') {
        hasHeading = true;
      }
    });
    expect(hasHeading).toBe(true);
  });

  it('parses AI directive tags into aiDirective nodes', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    const doc = parseMarkdown(
      editor,
      'Some text\n\n<ai instruction="summarize this" />\n\nMore text',
    );

    let hasDirective = false;
    doc.descendants((node: any) => {
      if (node.type.name === 'aiDirective') {
        hasDirective = true;
      }
    });
    expect(hasDirective).toBe(true);
  });

  it('does not modify the original editor state', async () => {
    const el = await createElement({ content: '# Original Content' });
    const editor = (el as any)._editor!;

    const originalDoc = editor.state.doc.toJSON();

    parseMarkdown(editor, '# Completely Different Content');

    // Original editor should be untouched
    expect(editor.state.doc.toJSON()).toEqual(originalDoc);
  });

  it('parses complex markdown with multiple elements', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    const markdown = [
      '# Title',
      '',
      'A paragraph with **bold** text.',
      '',
      '- Item 1',
      '- Item 2',
      '',
      '```js',
      'const x = 1;',
      '```',
    ].join('\n');

    const doc = parseMarkdown(editor, markdown);

    expect(doc.type.name).toBe('doc');
    // Should have multiple child nodes
    expect(doc.childCount).toBeGreaterThan(1);
  });
});
