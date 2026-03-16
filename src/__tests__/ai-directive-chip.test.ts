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
// Step 1: NodeView renderer — chip DOM structure
// ---------------------------------------------------------------------------
describe('AI directive chip rendering', () => {
  describe('chip DOM structure', () => {
    it('renders a .ai-chip element for a self-closing ai directive', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;
      editor.commands.setContent('<ai instruction="summarize this" />');
      await el.updateComplete;

      const chip = el.shadowRoot!.querySelector('.ai-chip');
      expect(chip).not.toBeNull();
    });

    it('renders a .ai-chip element for a block ai directive', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;
      editor.commands.setContent('<ai>expand this section</ai>');
      await el.updateComplete;

      const chip = el.shadowRoot!.querySelector('.ai-chip');
      expect(chip).not.toBeNull();
    });

    it('chip contains a play icon element', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;
      editor.commands.setContent('<ai instruction="test" />');
      await el.updateComplete;

      const icon = el.shadowRoot!.querySelector('.ai-chip__icon');
      expect(icon).not.toBeNull();
      expect(icon!.textContent).toContain('▶');
    });

    it('chip contains instruction text span', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;
      editor.commands.setContent('<ai instruction="summarize this" />');
      await el.updateComplete;

      const instruction = el.shadowRoot!.querySelector('.ai-chip__instruction');
      expect(instruction).not.toBeNull();
      expect(instruction!.textContent).toBe('summarize this');
    });

    it('chip displays block variant instruction text', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;
      editor.commands.setContent('<ai>expand this section</ai>');
      await el.updateComplete;

      const instruction = el.shadowRoot!.querySelector('.ai-chip__instruction');
      expect(instruction).not.toBeNull();
      expect(instruction!.textContent).toBe('expand this section');
    });

    it('chip has data-variant attribute matching the node variant', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;
      editor.commands.setContent('<ai instruction="test" />');
      await el.updateComplete;

      const chip = el.shadowRoot!.querySelector('.ai-chip');
      expect(chip).not.toBeNull();
      expect(chip!.getAttribute('data-variant')).toBe('self-closing');
    });

    it('block variant chip has data-variant="block"', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;
      editor.commands.setContent('<ai>block content</ai>');
      await el.updateComplete;

      const chip = el.shadowRoot!.querySelector('.ai-chip');
      expect(chip).not.toBeNull();
      expect(chip!.getAttribute('data-variant')).toBe('block');
    });
  });

  describe('chip updates on content change', () => {
    it('updates instruction text when node attributes change via setContent', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;
      editor.commands.setContent('<ai instruction="first instruction" />');
      await el.updateComplete;

      let instruction = el.shadowRoot!.querySelector('.ai-chip__instruction');
      expect(instruction!.textContent).toBe('first instruction');

      editor.commands.setContent('<ai instruction="updated instruction" />');
      await el.updateComplete;

      instruction = el.shadowRoot!.querySelector('.ai-chip__instruction');
      expect(instruction!.textContent).toBe('updated instruction');
    });

    it('updates data-variant when variant changes', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;
      editor.commands.setContent('<ai instruction="test" />');
      await el.updateComplete;

      let chip = el.shadowRoot!.querySelector('.ai-chip');
      expect(chip!.getAttribute('data-variant')).toBe('self-closing');

      editor.commands.setContent('<ai>test</ai>');
      await el.updateComplete;

      chip = el.shadowRoot!.querySelector('.ai-chip');
      expect(chip!.getAttribute('data-variant')).toBe('block');
    });

    it('renders multiple chips for multiple ai directives', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;
      editor.commands.setContent(
        '<ai instruction="first" /><p>separator</p><ai instruction="second" />',
      );
      await el.updateComplete;

      const chips = el.shadowRoot!.querySelectorAll('.ai-chip');
      expect(chips.length).toBe(2);
    });
  });
});

// ---------------------------------------------------------------------------
// Step 2: Chip CSS styles
// ---------------------------------------------------------------------------
describe('AI chip styles', () => {
  it('has .ai-chip CSS rule with background color', () => {
    const css = getStylesheetText();
    expect(css).toMatch(/\.ai-chip/);
    expect(css).toContain('--md-compleat-ai-chip-bg');
  });

  it('has .ai-chip CSS rule with left border accent', () => {
    const css = getStylesheetText();
    expect(css).toContain('--md-compleat-ai-chip-border');
  });

  it('has .ai-chip__icon styles', () => {
    const css = getStylesheetText();
    expect(css).toMatch(/\.ai-chip__icon/);
  });

  it('has .ai-chip__instruction styles with monospace font', () => {
    const css = getStylesheetText();
    expect(css).toMatch(/\.ai-chip__instruction/);
    expect(css).toContain('--md-compleat-font-mono');
  });

  it('defines CSS custom properties for consumer theming', () => {
    const css = getStylesheetText();
    expect(css).toContain('--md-compleat-ai-chip-bg');
    expect(css).toContain('--md-compleat-ai-chip-border');
  });
});

// ---------------------------------------------------------------------------
// Step 3: Inline editing of instruction text
// ---------------------------------------------------------------------------
describe('AI chip inline editing', () => {
  it('clicking the instruction span enters edit mode with an input', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="edit me" />');
    await el.updateComplete;

    const instruction = el.shadowRoot!.querySelector('.ai-chip__instruction') as HTMLElement;
    expect(instruction).not.toBeNull();
    instruction.click();
    await el.updateComplete;

    // After clicking, an input or textarea should appear within the chip
    const chip = el.shadowRoot!.querySelector('.ai-chip')!;
    const input = chip.querySelector('input, textarea') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe('edit me');
  });

  it('input is pre-filled with current instruction value', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="current value" />');
    await el.updateComplete;

    const instruction = el.shadowRoot!.querySelector('.ai-chip__instruction') as HTMLElement;
    instruction.click();
    await el.updateComplete;

    const chip = el.shadowRoot!.querySelector('.ai-chip')!;
    const input = chip.querySelector('input, textarea') as HTMLInputElement;
    expect(input.value).toBe('current value');
  });

  it('blur on input commits the edit and updates the node', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="original" />');
    await el.updateComplete;

    // Enter edit mode
    const instruction = el.shadowRoot!.querySelector('.ai-chip__instruction') as HTMLElement;
    instruction.click();
    await el.updateComplete;

    const chip = el.shadowRoot!.querySelector('.ai-chip')!;
    const input = chip.querySelector('input, textarea') as HTMLInputElement;

    // Change value and blur
    input.value = 'updated instruction';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    await el.updateComplete;

    // Verify the underlying ProseMirror node was updated
    const json = editor.getJSON();
    const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
    expect(aiNode).toBeDefined();
    expect(aiNode.attrs.instruction).toBe('updated instruction');
  });

  it('pressing Enter commits the edit', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="original" />');
    await el.updateComplete;

    const instruction = el.shadowRoot!.querySelector('.ai-chip__instruction') as HTMLElement;
    instruction.click();
    await el.updateComplete;

    const chip = el.shadowRoot!.querySelector('.ai-chip')!;
    const input = chip.querySelector('input, textarea') as HTMLInputElement;

    input.value = 'enter-committed';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    await el.updateComplete;

    const json = editor.getJSON();
    const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
    expect(aiNode.attrs.instruction).toBe('enter-committed');
  });

  it('pressing Escape reverts without saving', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="original" />');
    await el.updateComplete;

    const instruction = el.shadowRoot!.querySelector('.ai-chip__instruction') as HTMLElement;
    instruction.click();
    await el.updateComplete;

    const chip = el.shadowRoot!.querySelector('.ai-chip')!;
    const input = chip.querySelector('input, textarea') as HTMLInputElement;

    // Type something different, then Escape
    input.value = 'should not save';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await el.updateComplete;

    // The node should still have the original instruction
    const json = editor.getJSON();
    const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
    expect(aiNode.attrs.instruction).toBe('original');

    // Edit mode should exit — instruction span should be back
    const restoredInstruction = el.shadowRoot!.querySelector('.ai-chip__instruction');
    expect(restoredInstruction).not.toBeNull();
    expect(restoredInstruction!.textContent).toBe('original');
  });

  it('edit mode exits after committing, returning to display mode', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');
    await el.updateComplete;

    const instruction = el.shadowRoot!.querySelector('.ai-chip__instruction') as HTMLElement;
    instruction.click();
    await el.updateComplete;

    const chip = el.shadowRoot!.querySelector('.ai-chip')!;
    const input = chip.querySelector('input, textarea') as HTMLInputElement;

    input.dispatchEvent(new Event('blur', { bubbles: true }));
    await el.updateComplete;

    // Input should be gone, instruction span should be back
    const inputAfter = chip.querySelector('input, textarea');
    expect(inputAfter).toBeNull();

    const instructionAfter = chip.querySelector('.ai-chip__instruction');
    expect(instructionAfter).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Step 4: Slash command /ai for inserting new AI directives
// ---------------------------------------------------------------------------
describe('AI directive insertion commands', () => {
  describe('insertAiDirective command', () => {
    it('insertAiDirective command is registered on the editor', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;
      expect(typeof editor.commands.insertAiDirective).toBe('function');
    });

    it('insertAiDirective inserts an aiDirective node with given instruction', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;

      editor.commands.insertAiDirective({ instruction: 'test command' });
      await el.updateComplete;

      const json = editor.getJSON();
      const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
      expect(aiNode).toBeDefined();
      expect(aiNode.attrs.instruction).toBe('test command');
    });

    it('insertAiDirective inserts node with specified variant', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;

      editor.commands.insertAiDirective({
        instruction: 'block test',
        variant: 'block',
      });
      await el.updateComplete;

      const json = editor.getJSON();
      const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
      expect(aiNode).toBeDefined();
      expect(aiNode.attrs.variant).toBe('block');
    });

    it('insertAiDirective defaults to self-closing variant', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;

      editor.commands.insertAiDirective({ instruction: 'default variant' });
      await el.updateComplete;

      const json = editor.getJSON();
      const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
      expect(aiNode.attrs.variant).toBe('self-closing');
    });
  });

  describe('/ai input rule', () => {
    it('typing "/ai " at start of empty paragraph inserts an aiDirective node', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;

      // Focus and type "/ai " to trigger the input rule
      editor.commands.focus();
      editor.commands.insertContent('/ai ', { applyInputRules: true });
      await el.updateComplete;
      // Allow input rules to process
      await new Promise((resolve) => setTimeout(resolve, 0));

      const json = editor.getJSON();
      const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
      expect(aiNode).toBeDefined();
    });

    it('the slash command works at the start of an empty paragraph', async () => {
      const el = await createElement({ content: '' });
      const editor = (el as any)._editor!;

      editor.commands.focus('start');
      editor.commands.insertContent('/ai ', { applyInputRules: true });
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 0));

      const json = editor.getJSON();
      const hasAiNode = json.content?.some((n: any) => n.type === 'aiDirective');
      expect(hasAiNode).toBe(true);
    });

    it('/ai input rule does not trigger in the middle of text', async () => {
      const el = await createElement({ content: 'some existing text' });
      const editor = (el as any)._editor!;

      // Place cursor at the end and type "/ai "
      editor.commands.focus('end');
      editor.commands.insertContent('/ai ', { applyInputRules: true });
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 0));

      const json = editor.getJSON();
      const hasAiNode = json.content?.some((n: any) => n.type === 'aiDirective');
      expect(hasAiNode).toBe(false);
    });
  });

  describe('empty chip auto-edit mode', () => {
    it('newly inserted chip with empty instruction enters edit mode automatically', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;

      editor.commands.insertAiDirective({ instruction: '' });
      await el.updateComplete;

      // An empty chip should render with an input/textarea for immediate editing
      const chip = el.shadowRoot!.querySelector('.ai-chip');
      expect(chip).not.toBeNull();
      const input = chip!.querySelector('input, textarea');
      expect(input).not.toBeNull();
    });
  });

  describe('programmatic content does not trigger slash command', () => {
    it('programmatic setContent of "/ai " does not trigger input rule', async () => {
      const el = await createElement();
      const editor = (el as any)._editor!;

      // Use JSON format to preserve trailing space — HTML normalization strips it.
      // setContent is programmatic — should NOT trigger an input rule.
      editor.commands.setContent({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: '/ai ' }] },
        ],
      });
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 0));

      const json = editor.getJSON();
      const hasAiNode = json.content?.some(
        (n: any) => n.type === 'aiDirective',
      );
      expect(hasAiNode).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// NodeView stopEvent handler
// ---------------------------------------------------------------------------
describe('AI chip stopEvent', () => {
  it('stopEvent returns true for input, textarea, and toggle targets', async () => {
    const { aiDirectiveNodeView } = await import('../extensions/ai-directive-view.js');
    const el = await createElement();
    const editor = (el as any)._editor!;

    // Create a node to pass to the factory
    const nodeType = editor.schema.nodes.aiDirective;
    const node = nodeType.create({ instruction: 'test', variant: 'self-closing' });
    const view = aiDirectiveNodeView({
      node,
      editor,
      getPos: () => 0,
      HTMLAttributes: {},
      decorations: [] as any,
      innerDecorations: [] as any,
      extension: {} as any,
    });

    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const toggle = document.createElement('button');
    toggle.classList.add('ai-chip__toggle');
    const div = document.createElement('div');

    expect(view.stopEvent!({ target: input } as any)).toBe(true);
    expect(view.stopEvent!({ target: textarea } as any)).toBe(true);
    expect(view.stopEvent!({ target: toggle } as any)).toBe(true);
    expect(view.stopEvent!({ target: div } as any)).toBe(false);
  });

  it('toggle button click changes variant', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="test" />');
    await el.updateComplete;

    const toggle = el.shadowRoot!.querySelector('.ai-chip__toggle') as HTMLElement;
    expect(toggle).not.toBeNull();

    toggle.click();
    await el.updateComplete;

    const json = editor.getJSON();
    const aiNode = json.content?.find((n: any) => n.type === 'aiDirective');
    expect(aiNode.attrs.variant).toBe('block');
  });
});

// ---------------------------------------------------------------------------
// showDisplay fallback appendChild
// ---------------------------------------------------------------------------
describe('AI chip showDisplay fallback', () => {
  it('appends instruction span when no input/textarea exists in chip DOM', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="edit me" />');
    await el.updateComplete;

    // Enter edit mode
    const instruction = el.shadowRoot!.querySelector('.ai-chip__instruction') as HTMLElement;
    instruction.click();
    await el.updateComplete;

    const chip = el.shadowRoot!.querySelector('.ai-chip')!;
    const input = chip.querySelector('input, textarea') as HTMLInputElement;
    expect(input).not.toBeNull();

    // Manually remove the input to trigger the fallback appendChild path
    input.remove();

    // Now trigger showDisplay by blurring (commit fires, calls showDisplay)
    // Since input is detached, showDisplay won't find it and uses appendChild
    input.dispatchEvent(new Event('blur'));
    await el.updateComplete;

    // The instruction span should be appended
    const restoredInstruction = chip.querySelector('.ai-chip__instruction');
    expect(restoredInstruction).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Node view destruction safety
// ---------------------------------------------------------------------------
describe('node view destruction safety', () => {
  it('commit does not run showDisplay after node view is destroyed', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="edit me" />');
    await el.updateComplete;

    // Enter edit mode
    const instruction = el.shadowRoot!.querySelector('.ai-chip__instruction') as HTMLElement;
    instruction.click();
    await el.updateComplete;

    const chip = el.shadowRoot!.querySelector('.ai-chip')!;
    const input = chip.querySelector('input, textarea') as HTMLInputElement;
    expect(input).not.toBeNull();

    // Destroy the node view by clearing the document
    editor.commands.setContent('');
    await el.updateComplete;

    // Trigger blur on the now-orphaned input (fires commit)
    input.dispatchEvent(new Event('blur', { bubbles: true }));

    // With a destroyed guard, commit returns early — input stays in orphaned DOM.
    // Without the guard, showDisplay() replaces the input with a span.
    expect(chip.querySelector('input, textarea')).not.toBeNull();
  });

  it('revert does not run showDisplay after node view is destroyed', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;
    editor.commands.setContent('<ai instruction="edit me" />');
    await el.updateComplete;

    // Enter edit mode
    const instruction = el.shadowRoot!.querySelector('.ai-chip__instruction') as HTMLElement;
    instruction.click();
    await el.updateComplete;

    const chip = el.shadowRoot!.querySelector('.ai-chip')!;
    const input = chip.querySelector('input, textarea') as HTMLInputElement;
    expect(input).not.toBeNull();

    // Destroy the node view by clearing the document
    editor.commands.setContent('');
    await el.updateComplete;

    // Trigger Escape on the now-orphaned input (fires revert)
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );

    // With a destroyed guard, revert returns early — input stays in orphaned DOM.
    // Without the guard, showDisplay() replaces the input with a span.
    expect(chip.querySelector('input, textarea')).not.toBeNull();
  });

  it('auto-edit queueMicrotask does not enter edit mode after destruction', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    // Insert an AI directive with empty instruction — triggers queueMicrotask auto-edit.
    // Do NOT await between insert and destroy so the microtask hasn't fired yet.
    editor.commands.insertAiDirective({ instruction: '' });
    const chip = el.shadowRoot!.querySelector('.ai-chip')!;

    // Destroy the node view before the microtask fires
    editor.commands.setContent('');

    // Now let the microtask run
    await new Promise((resolve) => setTimeout(resolve, 0));

    // With a destroyed guard, enterEditMode returns early — no input created.
    // Without the guard, enterEditMode runs on orphaned DOM and creates an input.
    expect(chip.querySelector('input, textarea')).toBeNull();
  });
});
