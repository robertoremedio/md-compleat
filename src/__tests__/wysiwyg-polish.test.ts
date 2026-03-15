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

/**
 * Extract the full CSS text from the component's static styles.
 */
function getStylesheetText(): string {
  // Lit's static styles are CSSResult objects with a cssText property
  const styles = (MdCompleat as any).styles;
  if (!styles) return '';
  // styles can be a single CSSResult or an array
  if (Array.isArray(styles)) {
    return styles.map((s: any) => s.cssText ?? '').join('\n');
  }
  return styles.cssText ?? '';
}

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Step 1: Block element typography styles
// These tests verify that the component's static CSS includes rules for
// all rendered markdown elements. Currently the component only has minimal
// styles for :host, .editor, .ProseMirror, and .ProseMirror p.
// ---------------------------------------------------------------------------
describe('block element styles', () => {
  it('styles h1 elements within ProseMirror', () => {
    const css = getStylesheetText();
    expect(css).toMatch(/\.ProseMirror\s+h1|\.ProseMirror\s*>\s*h1/);
  });

  it('styles h2 through h6 elements within ProseMirror', () => {
    const css = getStylesheetText();
    expect(css).toMatch(/\.ProseMirror\s+h2|\.ProseMirror\s*>\s*h2/);
    expect(css).toMatch(/\.ProseMirror\s+h3|\.ProseMirror\s*>\s*h3/);
  });

  it('styles code blocks (pre > code) within ProseMirror', () => {
    const css = getStylesheetText();
    expect(css).toMatch(/\.ProseMirror\s+pre|pre\s*>\s*code/);
  });

  it('styles inline code within ProseMirror', () => {
    const css = getStylesheetText();
    // Should have specific inline code styling (background, padding, etc.)
    // Must match a code selector that's NOT inside a pre block
    expect(css).toMatch(
      /\.ProseMirror\s+:not\(pre\)\s*>\s*code|\.ProseMirror\s+code[^B]/,
    );
  });

  it('styles blockquotes within ProseMirror', () => {
    const css = getStylesheetText();
    expect(css).toMatch(
      /\.ProseMirror\s+blockquote|\.ProseMirror[^{]*blockquote/,
    );
  });

  it('styles unordered and ordered lists within ProseMirror', () => {
    const css = getStylesheetText();
    expect(css).toMatch(/\.ProseMirror[^{]*ul|\.ProseMirror[^{]*ol/);
  });

  it('styles tables within ProseMirror', () => {
    const css = getStylesheetText();
    expect(css).toMatch(/\.ProseMirror[^{]*table/);
  });

  it('styles horizontal rules within ProseMirror', () => {
    const css = getStylesheetText();
    expect(css).toMatch(/\.ProseMirror[^{]*hr/);
  });

  it('styles links within ProseMirror', () => {
    const css = getStylesheetText();
    expect(css).toMatch(/\.ProseMirror[^{]*\ba\b/);
  });

  it('defines CSS custom properties on :host for theming', () => {
    const css = getStylesheetText();
    expect(css).toContain('--md-compleat-');
  });
});

// ---------------------------------------------------------------------------
// Step 2: Focus state, scrollable overflow, and responsive width
// ---------------------------------------------------------------------------
describe('focus state and layout styles', () => {
  it('has focus-within styling on :host', () => {
    const css = getStylesheetText();
    expect(css).toMatch(/:host\(:focus-within\)/);
  });

  it('supports scrollable overflow via --md-compleat-max-height', () => {
    const css = getStylesheetText();
    expect(css).toContain('--md-compleat-max-height');
    expect(css).toMatch(/overflow/);
  });

  it('supports responsive width via --md-compleat-max-width', () => {
    const css = getStylesheetText();
    expect(css).toContain('--md-compleat-max-width');
  });

  it('has empty-state placeholder styling', () => {
    const css = getStylesheetText();
    // Tiptap uses .is-empty or [data-placeholder] for empty state
    expect(css).toMatch(/is-empty|placeholder/);
  });
});

// ---------------------------------------------------------------------------
// Step 3: Ctrl+K link shortcut (new behavior — window.prompt for URL)
// Bold (Ctrl+B) and Italic (Ctrl+I) already work via StarterKit.
// The new code is a Mod-k handler that prompts for a URL and applies a link.
// ---------------------------------------------------------------------------
describe('Ctrl+K link shortcut', () => {
  it('Mod-k keypress triggers window.prompt for URL input', async () => {
    const el = await createElement({ content: 'click here for info' });
    const editor = (el as any)._editor!;

    // Mock window.prompt to return a URL
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('https://example.com');

    // Select "here" (positions in ProseMirror doc)
    editor.commands.setTextSelection({ from: 7, to: 11 });

    // Simulate Mod-k keypress on the ProseMirror element
    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror') as HTMLElement;
    proseMirror.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      }),
    );

    await el.updateComplete;

    // window.prompt should have been called to get the URL
    expect(promptSpy).toHaveBeenCalled();

    promptSpy.mockRestore();
  });

  it('Mod-k applies link to selected text when URL is provided', async () => {
    const el = await createElement({ content: 'click here for info' });
    const editor = (el as any)._editor!;

    // Mock window.prompt to return a URL
    vi.spyOn(window, 'prompt').mockReturnValue('https://example.com');

    // Select "here"
    editor.commands.setTextSelection({ from: 7, to: 11 });

    // Simulate Mod-k keypress
    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror') as HTMLElement;
    proseMirror.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      }),
    );

    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    // The selected text should now be wrapped in a link
    const link = proseMirror.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('https://example.com');
    expect(link?.textContent).toContain('here');

    vi.restoreAllMocks();
  });

  it('Mod-k does not apply link when prompt is cancelled', async () => {
    const el = await createElement({ content: 'click here for info' });
    const editor = (el as any)._editor!;

    // Mock window.prompt to return null (cancelled)
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);

    // Select "here"
    editor.commands.setTextSelection({ from: 7, to: 11 });

    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror') as HTMLElement;
    proseMirror.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      }),
    );

    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    // prompt should have been called even though user cancelled
    expect(promptSpy).toHaveBeenCalled();

    // No link should be created when prompt is cancelled
    const link = proseMirror.querySelector('a');
    expect(link).toBeNull();

    vi.restoreAllMocks();
  });

  it('Mod-k removes existing link when cursor is inside a link', async () => {
    const el = await createElement({
      content: '[Example](https://example.com)',
    });
    const editor = (el as any)._editor!;

    // Mock window.prompt to return empty string (remove link)
    vi.spyOn(window, 'prompt').mockReturnValue('');

    // Place cursor inside the link text
    editor.commands.setTextSelection({ from: 2, to: 2 });

    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror') as HTMLElement;
    proseMirror.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      }),
    );

    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Link should be removed
    const link = proseMirror.querySelector('a');
    expect(link).toBeNull();

    vi.restoreAllMocks();
  });

  it('Mod-k applied link includes rel="noopener noreferrer"', async () => {
    const el = await createElement({ content: 'click here for info' });
    const editor = (el as any)._editor!;

    vi.spyOn(window, 'prompt').mockReturnValue('https://example.com');

    editor.commands.setTextSelection({ from: 7, to: 11 });

    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror') as HTMLElement;
    proseMirror.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      }),
    );

    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    const link = proseMirror.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');

    vi.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// Change 3: box-sizing: border-box on .editor
// ---------------------------------------------------------------------------
describe('editor box-sizing', () => {
  it('has box-sizing: border-box on the .editor CSS rule', () => {
    const css = getStylesheetText();
    expect(css).toContain('box-sizing: border-box');
  });
});

// ---------------------------------------------------------------------------
// Change 4: Input rule extensions are registered
// ---------------------------------------------------------------------------
describe('input rule extensions', () => {
  it('has heading extension registered (for # input rule)', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    const names = editor.extensionManager.extensions.map((e: any) => e.name);
    expect(names).toContain('heading');
  });

  it('has bulletList extension registered (for - input rule)', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    const names = editor.extensionManager.extensions.map((e: any) => e.name);
    expect(names).toContain('bulletList');
  });

  it('has orderedList extension registered (for 1. input rule)', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    const names = editor.extensionManager.extensions.map((e: any) => e.name);
    expect(names).toContain('orderedList');
  });

  it('has codeBlock extension registered (for ``` input rule)', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    const names = editor.extensionManager.extensions.map((e: any) => e.name);
    expect(names).toContain('codeBlock');
  });

  it('has blockquote extension registered (for > input rule)', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    const names = editor.extensionManager.extensions.map((e: any) => e.name);
    expect(names).toContain('blockquote');
  });
});
