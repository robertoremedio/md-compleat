import { describe, it, expect, afterEach } from 'vitest';
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
// Markdown extension must have html: false to prevent XSS vectors.
//
// The `html` option in tiptap-markdown controls two things:
// 1. Parsing: whether markdown-it passes raw HTML through (html_block/html_inline)
// 2. Serialization: whether nodes without markdown serializers emit HTML or placeholders
//
// With html: true, user-supplied markdown containing <script> or <img onerror>
// could be round-tripped through the editor, introducing XSS vectors.
// The AiExecute extension does NOT require html: true — editor.commands.setContent()
// uses Tiptap's schema-based HTML parser, not the markdown extension.
// ---------------------------------------------------------------------------
describe('Markdown html option is disabled', () => {
  it('Markdown extension is configured with html: false', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    const htmlOption = editor.storage.markdown.options.html;
    expect(htmlOption).toBe(false);
  });

  it('markdown-it parser has html disabled', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    // Access the internal markdown parser's markdown-it instance
    const parser = editor.storage.markdown.parser;
    expect(parser.md.options.html).toBe(false);
  });

  it('AiExecute setContent still works when html is false because it uses Tiptap HTML parser', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    // setContent uses Tiptap's schema-based HTML parser, not the markdown extension
    editor.commands.setContent(
      '<p>Some text</p><ai instruction="summarize this" />',
    );

    // The AI directive should be present in the editor
    const doc = editor.getJSON();
    const hasAiNode = JSON.stringify(doc).includes('summarize this');
    expect(hasAiNode).toBe(true);
  });

  it('still supports standard markdown syntax when html is disabled', async () => {
    const input = '# Heading\n\n**bold** and *italic*\n\n- list item';
    const el = await createElement({ content: input });
    const output = (el as any).getMarkdown() as string;

    expect(output).toContain('# Heading');
    expect(output).toContain('**bold**');
    expect(output).toContain('*italic*');
    expect(output).toContain('list item');
  });
});
