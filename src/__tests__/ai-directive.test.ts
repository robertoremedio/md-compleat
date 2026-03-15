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

    it('renders block variant back to HTML with text content', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;
      editor.commands.setContent('<ai>expand this section</ai>');

      const html = editor.getHTML();
      expect(html).toContain('<ai>expand this section</ai>');
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
});
