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
  const styles = (MdCompleat as any).styles;
  if (!styles) return '';
  if (Array.isArray(styles)) {
    return styles.map((s: any) => s.cssText ?? '').join('\n');
  }
  return styles.cssText ?? '';
}

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Step 1: Keyboard shortcut for AI directive insertion
// ---------------------------------------------------------------------------
describe('keyboard shortcut for AI directive insertion', () => {
  it('Ctrl+Shift+A inserts an aiDirective node', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    editor.commands.focus();
    await el.updateComplete;

    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror') as HTMLElement;
    proseMirror.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'A',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      }),
    );
    await el.updateComplete;

    const json = editor.getJSON();
    const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
    expect(aiNode).toBeDefined();
  });

  it('custom shortcut attribute works when configured', async () => {
    const el = await createElement({ 'ai-shortcut': 'Mod-Shift-d' });
    const editor = (el as any)._editor!;

    editor.commands.focus();
    await el.updateComplete;

    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror') as HTMLElement;
    proseMirror.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'd',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      }),
    );
    await el.updateComplete;

    const json = editor.getJSON();
    const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
    expect(aiNode).toBeDefined();
  });

  it('inserted node has empty instruction and auto-enters edit mode', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    editor.commands.focus();
    await el.updateComplete;

    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror') as HTMLElement;
    proseMirror.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'A',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      }),
    );
    await el.updateComplete;
    // Wait for queueMicrotask in NodeView to fire enterEditMode, but NOT
    // for the setTimeout inside it (which calls focus and can trigger a
    // spurious blur → commit → input removal when parallel tests steal focus).
    await new Promise((resolve) => queueMicrotask(resolve));

    const json = editor.getJSON();
    const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
    expect(aiNode).toBeDefined();
    expect(aiNode.attrs.instruction).toBe('');

    const chip = el.shadowRoot!.querySelector('.ai-chip');
    expect(chip).not.toBeNull();
    const input = chip!.querySelector('input, textarea');
    expect(input).not.toBeNull();
  });

  it('shortcut inserts at cursor position within existing content', async () => {
    const el = await createElement({ content: 'Hello world' });
    const editor = (el as any)._editor!;

    editor.commands.focus('end');
    await el.updateComplete;

    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror') as HTMLElement;
    proseMirror.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'A',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      }),
    );
    await el.updateComplete;

    const json = editor.getJSON();
    const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
    expect(aiNode).toBeDefined();
  });

  it('shortcut works inside a list item', async () => {
    const el = await createElement({ content: '- list item' });
    const editor = (el as any)._editor!;

    editor.commands.focus('end');
    await el.updateComplete;

    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror') as HTMLElement;
    proseMirror.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'A',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      }),
    );
    await el.updateComplete;

    const json = editor.getJSON();
    const hasAiNode = JSON.stringify(json).includes('"aiDirective"');
    expect(hasAiNode).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Step 2: Variant toggle on the chip node view
// ---------------------------------------------------------------------------
describe('variant toggle on chip', () => {
  it('chip contains a toggle button element', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');
    await el.updateComplete;

    const toggle = el.shadowRoot!.querySelector('.ai-chip__toggle');
    expect(toggle).not.toBeNull();
  });

  it('clicking toggle on self-closing chip changes variant to block', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');
    await el.updateComplete;

    const toggle = el.shadowRoot!.querySelector('.ai-chip__toggle') as HTMLElement;
    toggle.click();
    await el.updateComplete;

    const json = editor.getJSON();
    const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
    expect(aiNode.attrs.variant).toBe('block');
  });

  it('clicking toggle on block chip changes variant to self-closing', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai>test content</ai>');
    await el.updateComplete;

    const toggle = el.shadowRoot!.querySelector('.ai-chip__toggle') as HTMLElement;
    toggle.click();
    await el.updateComplete;

    const json = editor.getJSON();
    const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
    expect(aiNode.attrs.variant).toBe('self-closing');
  });

  it('block variant shows textarea in edit mode', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai>multi-line content</ai>');
    await el.updateComplete;

    const instruction = el.shadowRoot!.querySelector('.ai-chip__instruction') as HTMLElement;
    instruction.click();
    await el.updateComplete;

    const chip = el.shadowRoot!.querySelector('.ai-chip')!;
    const textarea = chip.querySelector('textarea');
    expect(textarea).not.toBeNull();
  });

  it('self-closing variant shows input in edit mode', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');
    await el.updateComplete;

    const instruction = el.shadowRoot!.querySelector('.ai-chip__instruction') as HTMLElement;
    instruction.click();
    await el.updateComplete;

    const chip = el.shadowRoot!.querySelector('.ai-chip')!;
    const input = chip.querySelector('input');
    expect(input).not.toBeNull();
    // Should not be a textarea
    const textarea = chip.querySelector('textarea');
    expect(textarea).toBeNull();
  });

  it('variant toggle preserves instruction text', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="preserved text" />');
    await el.updateComplete;

    const toggle = el.shadowRoot!.querySelector('.ai-chip__toggle') as HTMLElement;
    toggle.click();
    await el.updateComplete;

    const json = editor.getJSON();
    const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
    expect(aiNode.attrs.instruction).toBe('preserved text');
    expect(aiNode.attrs.variant).toBe('block');
  });

  it('has .ai-chip__toggle CSS styles', () => {
    const css = getStylesheetText();
    expect(css).toMatch(/\.ai-chip__toggle/);
  });
});

// ---------------------------------------------------------------------------
// Step 3: Slash command suggestion popup
// ---------------------------------------------------------------------------
describe('slash command suggestion popup', () => {
  it('aiSuggestion extension is registered on the editor', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    const names = editor.extensionManager.extensions.map((e: any) => e.name);
    expect(names).toContain('aiSuggestion');
  });

  it('typing "/ai" shows a suggestion dropdown in shadow root', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    editor.commands.focus();
    // Simulate typing "/ai" character by character
    editor.commands.insertContent('/ai');
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    const dropdown = el.shadowRoot!.querySelector('.ai-suggestion');
    expect(dropdown).not.toBeNull();
  });

  it('pressing Enter with suggestion visible inserts aiDirective and removes trigger text', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    editor.commands.focus();
    editor.commands.insertContent('/ai');
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    const dropdown = el.shadowRoot!.querySelector('.ai-suggestion');
    expect(dropdown).not.toBeNull();

    // Press Enter to accept suggestion
    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror') as HTMLElement;
    proseMirror.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    const json = editor.getJSON();
    const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
    expect(aiNode).toBeDefined();

    // Trigger text "/ai" should be removed
    const hasSlashText = JSON.stringify(json).includes('/ai');
    expect(hasSlashText).toBe(false);
  });

  it('pressing Escape dismisses dropdown and text remains', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    editor.commands.focus();
    editor.commands.insertContent('/ai');
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    const dropdown = el.shadowRoot!.querySelector('.ai-suggestion');
    expect(dropdown).not.toBeNull();

    // Press Escape to dismiss
    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror') as HTMLElement;
    proseMirror.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await el.updateComplete;

    const dropdownAfter = el.shadowRoot!.querySelector('.ai-suggestion');
    expect(dropdownAfter).toBeNull();

    // The "/ai" text should remain in the editor
    const text = editor.getText();
    expect(text).toContain('/ai');
  });

  it('typing "/ai " (with space) still triggers existing input rule as fallback', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    editor.commands.focus();
    editor.commands.insertContent('/ai ', { applyInputRules: true });
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    const json = editor.getJSON();
    const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
    expect(aiNode).toBeDefined();
  });

  it('suggestion does not appear when "/ai" is typed mid-paragraph', async () => {
    const el = await createElement({ content: 'some text' });
    const editor = (el as any)._editor!;

    editor.commands.focus('end');
    editor.commands.insertContent('/ai');
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    const dropdown = el.shadowRoot!.querySelector('.ai-suggestion');
    expect(dropdown).toBeNull();
  });

  it('clicking the suggestion item inserts aiDirective', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    editor.commands.focus();
    editor.commands.insertContent('/ai');
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    const dropdown = el.shadowRoot!.querySelector('.ai-suggestion');
    expect(dropdown).not.toBeNull();

    // Click the suggestion item
    (dropdown as HTMLElement).click();
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    const json = editor.getJSON();
    const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
    expect(aiNode).toBeDefined();
  });

  it('has .ai-suggestion CSS styles for the dropdown', () => {
    const css = getStylesheetText();
    expect(css).toMatch(/\.ai-suggestion/);
  });
});

// ---------------------------------------------------------------------------
// Change 1: No inline style mutation on editor element
// ---------------------------------------------------------------------------
describe('dropdown positioning uses CSS not inline styles', () => {
  it('.editor CSS rule includes position: relative', () => {
    const css = getStylesheetText();
    // The .editor rule should contain position: relative so the
    // absolutely-positioned dropdown is anchored without inline mutation.
    expect(css).toMatch(/\.editor\s*\{[^}]*position:\s*relative/);
  });

  it('showing the suggestion dropdown does not mutate inline position style', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    const editorEl = el.shadowRoot!.querySelector('.editor') as HTMLElement;

    // Record the inline position before triggering the dropdown
    const originalPosition = editorEl.style.position;

    editor.commands.focus();
    editor.commands.insertContent('/ai');
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Dropdown should be visible
    const dropdown = el.shadowRoot!.querySelector('.ai-suggestion');
    expect(dropdown).not.toBeNull();

    // Inline position must NOT have been mutated
    expect(editorEl.style.position).toBe(originalPosition);
  });

  it('dismissing the dropdown leaves no residual inline position style', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    const editorEl = el.shadowRoot!.querySelector('.editor') as HTMLElement;

    const originalPosition = editorEl.style.position;

    editor.commands.focus();
    editor.commands.insertContent('/ai');
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Dismiss via Escape
    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror') as HTMLElement;
    proseMirror.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await el.updateComplete;

    // Inline position must be unchanged from original
    expect(editorEl.style.position).toBe(originalPosition);
  });
});

// ---------------------------------------------------------------------------
// Change 2: Atomic accept — delete + insert in a single transaction
// ---------------------------------------------------------------------------
describe('accept uses atomic transaction', () => {
  it('a single undo after accepting reverts both deletion and insertion', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    editor.commands.focus();
    editor.commands.insertContent('/ai');
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    const dropdown = el.shadowRoot!.querySelector('.ai-suggestion');
    expect(dropdown).not.toBeNull();

    // Accept the suggestion via Enter
    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror') as HTMLElement;
    proseMirror.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify aiDirective was inserted
    let json = editor.getJSON();
    const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
    expect(aiNode).toBeDefined();

    // A single undo should revert the entire accept operation atomically:
    // both the "/ai" deletion and the aiDirective insertion.
    editor.commands.undo();
    await el.updateComplete;

    json = editor.getJSON();
    const aiNodeAfterUndo = json.content?.find(
      (n: any) => n.type === 'aiDirective',
    );
    expect(aiNodeAfterUndo).toBeUndefined();

    // The original "/ai" text should be restored
    const text = editor.getText();
    expect(text).toContain('/ai');
  });

  it('a single undo after click-accept also reverts atomically', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    editor.commands.focus();
    editor.commands.insertContent('/ai');
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    const dropdown = el.shadowRoot!.querySelector('.ai-suggestion');
    expect(dropdown).not.toBeNull();

    // Accept via click
    (dropdown as HTMLElement).click();
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify insertion
    let json = editor.getJSON();
    expect(json.content?.find((n: any) => n.type === 'aiDirective')).toBeDefined();

    // Single undo should revert everything
    editor.commands.undo();
    await el.updateComplete;

    json = editor.getJSON();
    expect(
      json.content?.find((n: any) => n.type === 'aiDirective'),
    ).toBeUndefined();
    expect(editor.getText()).toContain('/ai');
  });
});
