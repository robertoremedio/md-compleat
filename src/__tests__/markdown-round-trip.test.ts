import { describe, it, expect, vi, afterEach } from 'vitest';
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
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Step 2: Markdown extension wiring and getMarkdown() method
// ---------------------------------------------------------------------------
describe('markdown extension and getMarkdown()', () => {
  it('exposes a public getMarkdown() method', async () => {
    const el = await createElement();
    expect(typeof (el as any).getMarkdown).toBe('function');
  });

  it('getMarkdown() returns a string', async () => {
    const el = await createElement({ content: '# Hello' });
    const md = (el as any).getMarkdown() as string;
    expect(typeof md).toBe('string');
  });

  it('parses markdown content on initialization', async () => {
    const el = await createElement({ content: '# Hello World' });
    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror');
    // Should render as an h1, not raw markdown text
    const h1 = proseMirror?.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1?.textContent).toContain('Hello World');
  });

  it('round-trips simple markdown through parse and serialize', async () => {
    const input = '# Hello World';
    const el = await createElement({ content: input });
    const output = (el as any).getMarkdown() as string;
    expect(output.trim()).toContain('# Hello World');
  });

  it('content-changed event emits markdown (not HTML)', async () => {
    const el = await createElement();
    const handler = vi.fn();
    el.addEventListener('content-changed', handler);

    // Trigger editor content change
    (el as any)._editor?.commands.setContent('<p>Some text</p>');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(handler).toHaveBeenCalled();
    const event = handler.mock.calls[0][0] as CustomEvent;
    // Should be markdown, not HTML — no angle brackets for a plain paragraph
    expect(event.detail.content).not.toContain('<p>');
    expect(event.detail.content).toContain('Some text');
  });

  it('setting content property with markdown parses it in the editor', async () => {
    const el = await createElement();
    el.content = '**bold text**';
    await el.updateComplete;

    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror');
    const strong = proseMirror?.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toContain('bold text');
  });
});

// ---------------------------------------------------------------------------
// Step 3: Image extension round-trip
// ---------------------------------------------------------------------------
describe('image round-trip', () => {
  it('parses markdown image syntax into an img element', async () => {
    const el = await createElement({ content: '![alt text](https://example.com/image.png)' });
    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror');
    const img = proseMirror?.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://example.com/image.png');
    expect(img?.getAttribute('alt')).toBe('alt text');
  });

  it('serializes image back to markdown', async () => {
    const input = '![alt text](https://example.com/image.png)';
    const el = await createElement({ content: input });
    const output = (el as any).getMarkdown() as string;
    expect(output).toContain('![alt text](https://example.com/image.png)');
  });
});

// ---------------------------------------------------------------------------
// Step 4: Table extension round-trip
// ---------------------------------------------------------------------------
describe('table round-trip', () => {
  const tableMarkdown = [
    '| Header 1 | Header 2 |',
    '| --- | --- |',
    '| Cell 1 | Cell 2 |',
    '| Cell 3 | Cell 4 |',
  ].join('\n');

  it('parses markdown table into a table element', async () => {
    const el = await createElement({ content: tableMarkdown });
    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror');
    const table = proseMirror?.querySelector('table');
    expect(table).not.toBeNull();

    const headerCells = table?.querySelectorAll('th');
    expect(headerCells?.length).toBeGreaterThanOrEqual(2);
    expect(headerCells?.[0]?.textContent).toContain('Header 1');
    expect(headerCells?.[1]?.textContent).toContain('Header 2');
  });

  it('serializes table back to pipe-delimited markdown', async () => {
    const el = await createElement({ content: tableMarkdown });
    const output = (el as any).getMarkdown() as string;
    expect(output).toContain('Header 1');
    expect(output).toContain('Header 2');
    expect(output).toContain('Cell 1');
    expect(output).toContain('|');
  });
});

// ---------------------------------------------------------------------------
// Step 5: Comprehensive round-trip tests for all elements
// ---------------------------------------------------------------------------
describe('heading round-trips', () => {
  it.each([
    ['# Heading 1', 'h1'],
    ['## Heading 2', 'h2'],
    ['### Heading 3', 'h3'],
    ['#### Heading 4', 'h4'],
    ['##### Heading 5', 'h5'],
    ['###### Heading 6', 'h6'],
  ])('round-trips %s', async (input, tag) => {
    const el = await createElement({ content: input });

    // Verify parse: heading tag exists in editor
    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror');
    const heading = proseMirror?.querySelector(tag);
    expect(heading).not.toBeNull();

    // Verify serialize: markdown output contains heading syntax
    const output = (el as any).getMarkdown() as string;
    expect(output.trim()).toContain(input);
  });
});

describe('inline formatting round-trips', () => {
  it('round-trips bold text', async () => {
    const el = await createElement({ content: '**bold**' });
    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror');
    expect(proseMirror?.querySelector('strong')).not.toBeNull();

    const output = (el as any).getMarkdown() as string;
    expect(output).toContain('**bold**');
  });

  it('round-trips italic text', async () => {
    const el = await createElement({ content: '*italic*' });
    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror');
    expect(proseMirror?.querySelector('em')).not.toBeNull();

    const output = (el as any).getMarkdown() as string;
    expect(output).toContain('*italic*');
  });

  it('round-trips inline code', async () => {
    const el = await createElement({ content: 'use `console.log()` here' });
    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror');
    expect(proseMirror?.querySelector('code')).not.toBeNull();

    const output = (el as any).getMarkdown() as string;
    expect(output).toContain('`console.log()`');
  });
});

describe('link round-trip', () => {
  it('round-trips a markdown link', async () => {
    const el = await createElement({ content: '[Example](https://example.com)' });
    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror');
    const link = proseMirror?.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('https://example.com');
    expect(link?.textContent).toContain('Example');

    const output = (el as any).getMarkdown() as string;
    expect(output).toContain('[Example](https://example.com)');
  });
});

describe('code block round-trip', () => {
  it('round-trips a fenced code block', async () => {
    const input = '```javascript\nconst x = 1;\n```';
    const el = await createElement({ content: input });
    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror');
    const pre = proseMirror?.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre?.textContent).toContain('const x = 1;');

    const output = (el as any).getMarkdown() as string;
    expect(output).toContain('```');
    expect(output).toContain('const x = 1;');
  });
});

describe('list round-trips', () => {
  it('round-trips an unordered list', async () => {
    const input = '- Item 1\n- Item 2\n- Item 3';
    const el = await createElement({ content: input });
    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror');
    const ul = proseMirror?.querySelector('ul');
    expect(ul).not.toBeNull();
    const items = ul?.querySelectorAll('li');
    expect(items?.length).toBe(3);

    const output = (el as any).getMarkdown() as string;
    expect(output).toContain('Item 1');
    expect(output).toContain('Item 2');
    expect(output).toContain('Item 3');
    // Should use list markers, not raw text
    expect(output).toMatch(/[-*]\s+Item 1/);
  });

  it('round-trips an ordered list', async () => {
    const input = '1. First\n2. Second\n3. Third';
    const el = await createElement({ content: input });
    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror');
    const ol = proseMirror?.querySelector('ol');
    expect(ol).not.toBeNull();

    const output = (el as any).getMarkdown() as string;
    expect(output).toContain('First');
    expect(output).toMatch(/1\.\s+First/);
  });
});

describe('blockquote round-trip', () => {
  it('round-trips a blockquote', async () => {
    const input = '> This is a quote';
    const el = await createElement({ content: input });
    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror');
    expect(proseMirror?.querySelector('blockquote')).not.toBeNull();

    const output = (el as any).getMarkdown() as string;
    expect(output).toContain('> This is a quote');
  });
});

describe('horizontal rule round-trip', () => {
  it('round-trips a horizontal rule', async () => {
    const input = 'Before\n\n---\n\nAfter';
    const el = await createElement({ content: input });
    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror');
    expect(proseMirror?.querySelector('hr')).not.toBeNull();

    const output = (el as any).getMarkdown() as string;
    expect(output).toContain('Before');
    expect(output).toContain('After');
    expect(output).toMatch(/---/);
  });
});
