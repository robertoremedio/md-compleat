import { describe, it, expect, afterEach } from 'vitest';
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
// AiDirective node extension
// ---------------------------------------------------------------------------
describe('AiDirective node extension', () => {
  describe('extension registration', () => {
    it('registers the aiDirective extension', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;
      const names = editor.extensionManager.extensions.map((e: any) => e.name);
      expect(names).toContain('aiDirective');
    });
  });

  describe('self-closing variant parsing', () => {
    it('parses self-closing <ai instruction="..." /> into aiDirective node', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;
      editor.commands.setContent('<ai instruction="summarize this" />');

      const json = editor.getJSON();
      const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
      expect(aiNode).toBeDefined();
      expect(aiNode.attrs.instruction).toBe('summarize this');
      expect(aiNode.attrs.variant).toBe('self-closing');
    });

    it('renders self-closing variant back to HTML with instruction attribute', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;
      editor.commands.setContent('<ai instruction="summarize this" />');

      const html = editor.getHTML();
      expect(html).toContain('<ai');
      expect(html).toContain('instruction="summarize this"');
    });
  });

  describe('block variant parsing', () => {
    it('parses block <ai>instructions</ai> into aiDirective node', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;
      editor.commands.setContent('<ai>expand this section</ai>');

      const json = editor.getJSON();
      const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
      expect(aiNode).toBeDefined();
      expect(aiNode.attrs.instruction).toBe('expand this section');
      expect(aiNode.attrs.variant).toBe('block');
    });

    it('renders block variant back to HTML with instruction attribute', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;
      editor.commands.setContent('<ai>expand this section</ai>');

      const html = editor.getHTML();
      expect(html).toContain('instruction="expand this section"');
      expect(html).toContain('data-variant="block"');
    });
  });

  describe('attributes', () => {
    it('stores instruction as a string', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;
      editor.commands.setContent('<ai instruction="test instruction" />');

      const json = editor.getJSON();
      const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
      expect(typeof aiNode.attrs.instruction).toBe('string');
    });

    it('variant is either "block" or "self-closing"', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;

      editor.commands.setContent('<ai instruction="test" />');
      let json = editor.getJSON();
      let aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
      expect(aiNode.attrs.variant).toBe('self-closing');

      editor.commands.setContent('<ai>test</ai>');
      json = editor.getJSON();
      aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
      expect(aiNode.attrs.variant).toBe('block');
    });
  });

  describe('edge cases', () => {
    it('handles empty instruction in self-closing form', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;
      editor.commands.setContent('<ai instruction="" />');

      const json = editor.getJSON();
      const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
      expect(aiNode).toBeDefined();
      expect(aiNode.attrs.instruction).toBe('');
    });

    it('handles empty instruction in block form', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;
      editor.commands.setContent('<ai></ai>');

      const json = editor.getJSON();
      const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
      expect(aiNode).toBeDefined();
      expect(aiNode.attrs.instruction).toBe('');
    });
  });

  describe('markdown serialization', () => {
    it('serializes self-closing variant to markdown with instruction attribute', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;
      editor.commands.setContent('<ai instruction="summarize this" />');

      const markdown = (el as any).getMarkdown() as string;
      expect(markdown).toContain('<ai instruction="summarize this" />');
    });

    it('serializes block variant to markdown with content between tags', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;
      editor.commands.setContent('<ai>expand this section</ai>');

      const markdown = (el as any).getMarkdown() as string;
      expect(markdown).toContain('<ai>expand this section</ai>');
    });
  });

  // -------------------------------------------------------------------------
  // Markdown round-trip: markdown → editor (via content attr) → markdown
  // -------------------------------------------------------------------------
  describe('markdown round-trip', () => {
    it('self-closing variant survives markdown round-trip', async () => {
      const input = '<ai instruction="summarize this" />';
      const el = await createElement({ content: input });
      const output = (el as any).getMarkdown() as string;
      expect(output.trim()).toBe(input);
    });

    it('block variant survives markdown round-trip', async () => {
      const input = '<ai>expand this section</ai>';
      const el = await createElement({ content: input });
      const output = (el as any).getMarkdown() as string;
      expect(output.trim()).toBe(input);
    });

    it('double round-trip produces identical output', async () => {
      const input = '<ai instruction="summarize this" />';
      const el = await createElement({ content: input });
      const firstOutput = (el as any).getMarkdown() as string;

      // Feed serialized output back as new content
      el.content = firstOutput.trim();
      await el.updateComplete;
      const secondOutput = (el as any).getMarkdown() as string;

      expect(secondOutput.trim()).toBe(firstOutput.trim());
    });

    it('double round-trip for block variant produces identical output', async () => {
      const input = '<ai>expand this section</ai>';
      const el = await createElement({ content: input });
      const firstOutput = (el as any).getMarkdown() as string;

      el.content = firstOutput.trim();
      await el.updateComplete;
      const secondOutput = (el as any).getMarkdown() as string;

      expect(secondOutput.trim()).toBe(firstOutput.trim());
    });
  });

  // -------------------------------------------------------------------------
  // Special characters in instructions
  // -------------------------------------------------------------------------
  describe('markdown round-trip with special characters', () => {
    it('self-closing with double quotes in instruction', async () => {
      const input = '<ai instruction="say &quot;hello&quot;" />';
      const el = await createElement({ content: input });
      const output = (el as any).getMarkdown() as string;
      expect(output.trim()).toBe(input);
    });

    it('self-closing with ampersand in instruction', async () => {
      const input = '<ai instruction="A &amp; B" />';
      const el = await createElement({ content: input });
      const output = (el as any).getMarkdown() as string;
      expect(output.trim()).toBe(input);
    });

    it('block with angle brackets in content', async () => {
      const input = '<ai>use <em> tags</ai>';
      const el = await createElement({ content: input });
      const editor = (el as any)._editor!;
      const json = editor.getJSON();
      const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
      expect(aiNode).toBeDefined();
      expect(aiNode.attrs.instruction).toBe('use <em> tags');
    });

    it('block with angle brackets survives round-trip', async () => {
      const input = '<ai>use <em> tags</ai>';
      const el = await createElement({ content: input });
      const output = (el as any).getMarkdown() as string;
      expect(output.trim()).toBe(input);
    });

    it('block with angle brackets survives double round-trip', async () => {
      const input = '<ai>use <em> tags</ai>';
      const el = await createElement({ content: input });
      const firstOutput = (el as any).getMarkdown() as string;

      el.content = firstOutput.trim();
      await el.updateComplete;
      const secondOutput = (el as any).getMarkdown() as string;

      expect(secondOutput.trim()).toBe(firstOutput.trim());
    });

    it('block with ampersand survives double round-trip', async () => {
      const input = '<ai>A & B</ai>';
      const el = await createElement({ content: input });
      const firstOutput = (el as any).getMarkdown() as string;

      el.content = firstOutput.trim();
      await el.updateComplete;
      const secondOutput = (el as any).getMarkdown() as string;

      expect(secondOutput.trim()).toBe(firstOutput.trim());
    });

    it('block with literal ampersand entity survives double round-trip', async () => {
      const input = '<ai>&amp;</ai>';
      const el = await createElement({ content: input });
      const firstOutput = (el as any).getMarkdown() as string;

      el.content = firstOutput.trim();
      await el.updateComplete;
      const secondOutput = (el as any).getMarkdown() as string;

      expect(secondOutput.trim()).toBe(firstOutput.trim());
    });

    it('block with markdown-like content stores literally', async () => {
      const input = '<ai>add a **bold** heading</ai>';
      const el = await createElement({ content: input });
      const editor = (el as any)._editor!;
      const json = editor.getJSON();
      const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
      expect(aiNode).toBeDefined();
      // Content should be stored as literal string, not parsed as markdown
      expect(aiNode.attrs.instruction).toBe('add a **bold** heading');
    });
  });

  // -------------------------------------------------------------------------
  // Structural edge cases
  // -------------------------------------------------------------------------
  describe('markdown round-trip structural edge cases', () => {
    it('multi-line block content round-trips', async () => {
      const input = '<ai>\nline one\nline two\n</ai>';
      const el = await createElement({ content: input });
      const editor = (el as any)._editor!;
      const json = editor.getJSON();
      const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
      expect(aiNode).toBeDefined();
      expect(aiNode.attrs.instruction).toContain('line one');
      expect(aiNode.attrs.instruction).toContain('line two');

      const output = (el as any).getMarkdown() as string;
      expect(output).toContain('line one');
      expect(output).toContain('line two');
    });

    it('ai tag adjacent to other markdown elements', async () => {
      const input = 'Before paragraph\n\n<ai instruction="do something" />\n\nAfter paragraph';
      const el = await createElement({ content: input });
      const output = (el as any).getMarkdown() as string;
      expect(output).toContain('Before paragraph');
      expect(output).toContain('<ai instruction="do something" />');
      expect(output).toContain('After paragraph');
    });

    it('empty self-closing variant round-trips via markdown', async () => {
      const input = '<ai instruction="" />';
      const el = await createElement({ content: input });
      const output = (el as any).getMarkdown() as string;
      expect(output.trim()).toBe(input);
    });

    it('empty block variant round-trips via markdown', async () => {
      const input = '<ai></ai>';
      const el = await createElement({ content: input });
      const output = (el as any).getMarkdown() as string;
      expect(output.trim()).toBe(input);
    });

    it('ai tags parse correctly despite html:false on Markdown extension', async () => {
      // This tests that the custom markdown-it rule fires before html_block
      // and works even when the Markdown extension has html: false
      const input = '<ai instruction="test html false" />';
      const el = await createElement({ content: input });
      const editor = (el as any)._editor!;
      const json = editor.getJSON();
      const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
      expect(aiNode).toBeDefined();
      expect(aiNode.attrs.instruction).toBe('test html false');
      expect(aiNode.attrs.variant).toBe('self-closing');
    });
  });
});
