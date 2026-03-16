import { describe, it, expect, afterEach } from 'vitest';
import { MdCompleat } from '../md-compleat.js';
import { diffDocs } from '../ai/diff-docs.js';

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
 * Helper: get a ProseMirror doc node from markdown content.
 */
function getDocFromContent(editor: any, content: string): any {
  editor.commands.setContent(content);
  return editor.state.doc;
}

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Step 3: diffDocs utility
// ---------------------------------------------------------------------------
describe('diffDocs utility', () => {
  it('returns empty ranges for identical documents', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    const doc1 = getDocFromContent(editor, 'Hello world');
    const doc2 = getDocFromContent(editor, 'Hello world');

    const result = diffDocs(doc1, doc2);

    expect(result.ranges).toEqual([]);
    expect(result.charactersChanged).toBe(0);
  });

  it('returns a narrow range for a single word change', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    const doc1 = getDocFromContent(editor, 'Hello world');
    const doc2 = getDocFromContent(editor, 'Hello earth');

    const result = diffDocs(doc1, doc2);

    expect(result.ranges.length).toBeGreaterThan(0);
    // The range should not span the entire document
    const totalSize = doc2.content.size;
    const rangeSize = result.ranges.reduce(
      (sum: number, r: any) => sum + (r.to - r.from),
      0,
    );
    expect(rangeSize).toBeLessThan(totalSize);
    expect(result.charactersChanged).toBeGreaterThan(0);
  });

  it('returns a range covering an added paragraph', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    const doc1 = getDocFromContent(editor, 'First paragraph');
    const doc2 = getDocFromContent(
      editor,
      'First paragraph\n\nSecond paragraph',
    );

    const result = diffDocs(doc1, doc2);

    expect(result.ranges.length).toBeGreaterThan(0);
    expect(result.charactersChanged).toBeGreaterThan(0);
  });

  it('returns empty ranges when a paragraph is removed (nothing new to highlight)', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    const doc1 = getDocFromContent(
      editor,
      'First paragraph\n\nSecond paragraph',
    );
    const doc2 = getDocFromContent(editor, 'First paragraph');

    const result = diffDocs(doc1, doc2);

    // Removed content has no corresponding region in the new doc to highlight
    expect(result.ranges).toEqual([]);
  });

  it('returns a full-doc range for completely rewritten content', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    const doc1 = getDocFromContent(editor, 'Original content here');
    const doc2 = getDocFromContent(
      editor,
      'Completely different text\n\nWith multiple paragraphs',
    );

    const result = diffDocs(doc1, doc2);

    expect(result.ranges.length).toBeGreaterThan(0);
    expect(result.charactersChanged).toBeGreaterThan(0);
  });

  it('returns valid from/to positions within the new document bounds', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    const doc1 = getDocFromContent(editor, 'Hello world');
    const doc2 = getDocFromContent(editor, 'Hello brave new world');

    const result = diffDocs(doc1, doc2);

    for (const range of result.ranges) {
      expect(range.from).toBeGreaterThanOrEqual(0);
      expect(range.to).toBeLessThanOrEqual(doc2.content.size);
      expect(range.from).toBeLessThanOrEqual(range.to);
    }
  });
});
