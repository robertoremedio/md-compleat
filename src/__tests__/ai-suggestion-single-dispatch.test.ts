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
// Change 1: closeHistory and replaceWith must be a single dispatch
// ---------------------------------------------------------------------------
describe('accept combines closeHistory and replaceWith in one transaction', () => {
  it('dispatches exactly one transaction when accepting via Enter', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    editor.commands.focus();
    editor.commands.insertContent('/ai');
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    const dropdown = el.shadowRoot!.querySelector('.ai-suggestion');
    expect(dropdown).not.toBeNull();

    // Spy on dispatch after the suggestion is shown
    const dispatchSpy = vi.spyOn(editor.view, 'dispatch');

    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror') as HTMLElement;
    proseMirror.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    // The accept operation must use exactly one dispatch call with steps,
    // combining closeHistory and replaceWith in the same transaction.
    // Current code dispatches two: one for closeHistory, one for replaceWith.
    // (Tiptap may dispatch additional no-op transactions for keyboard handling.)
    const acceptDispatches = dispatchSpy.mock.calls.filter(
      ([tr]: any) => tr.steps && tr.steps.length > 0,
    );
    expect(acceptDispatches).toHaveLength(1);

    dispatchSpy.mockRestore();
  });

  it('dispatches exactly one transaction when accepting via click', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    editor.commands.focus();
    editor.commands.insertContent('/ai');
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    const dropdown = el.shadowRoot!.querySelector('.ai-suggestion');
    expect(dropdown).not.toBeNull();

    const dispatchSpy = vi.spyOn(editor.view, 'dispatch');

    (dropdown as HTMLElement).click();
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Same requirement: single dispatch with steps for the accept operation
    const acceptDispatches = dispatchSpy.mock.calls.filter(
      ([tr]: any) => tr.steps && tr.steps.length > 0,
    );
    expect(acceptDispatches).toHaveLength(1);

    dispatchSpy.mockRestore();
  });

  it('the single dispatched transaction contains both closeHistory meta and replaceWith step', async () => {
    const el = await createElement();
    const editor = (el as any)._editor!;

    editor.commands.focus();
    editor.commands.insertContent('/ai');
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    const dropdown = el.shadowRoot!.querySelector('.ai-suggestion');
    expect(dropdown).not.toBeNull();

    const dispatchSpy = vi.spyOn(editor.view, 'dispatch');

    const proseMirror = el.shadowRoot!.querySelector('.ProseMirror') as HTMLElement;
    proseMirror.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    // The single transaction with steps should have a ReplaceStep (from replaceWith)
    const tr = dispatchSpy.mock.calls
      .map(([t]: any) => t)
      .find((t: any) => t.steps && t.steps.length > 0);
    expect(tr).toBeDefined();
    expect(tr.steps.length).toBeGreaterThan(0);

    // And should carry the closeHistory metadata
    // prosemirror-history uses PluginKey("closeHistory") which maps to internal key "closeHistory$"
    expect(tr.getMeta('closeHistory$')).toBeTruthy();

    dispatchSpy.mockRestore();
  });
});
