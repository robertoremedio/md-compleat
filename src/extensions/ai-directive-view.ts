import type { NodeViewRendererProps } from '@tiptap/core';

export function aiDirectiveNodeView({ node, editor, getPos }: NodeViewRendererProps) {
  let currentNode = node;
  let editing = false;
  let destroyed = false;

  const dom = document.createElement('div');
  dom.classList.add('ai-chip');
  dom.setAttribute('data-variant', currentNode.attrs.variant);

  const icon = document.createElement('span');
  icon.classList.add('ai-chip__icon');
  icon.textContent = '▶';
  dom.appendChild(icon);

  const toggle = document.createElement('button');
  toggle.classList.add('ai-chip__toggle');
  toggle.textContent = '⤢';
  toggle.type = 'button';
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const newVariant = currentNode.attrs.variant === 'self-closing' ? 'block' : 'self-closing';
    updateAttributes({ variant: newVariant });
  });
  dom.appendChild(toggle);

  let instructionEl = createInstructionSpan();
  dom.appendChild(instructionEl);

  // Auto-enter edit mode for empty instructions
  if (!currentNode.attrs.instruction) {
    queueMicrotask(() => enterEditMode(true));
  }

  function createInstructionSpan(): HTMLSpanElement {
    const span = document.createElement('span');
    span.classList.add('ai-chip__instruction');
    span.textContent = currentNode.attrs.instruction;
    span.addEventListener('click', () => enterEditMode(false));
    return span;
  }

  function updateAttributes(attrs: Record<string, any>) {
    const pos = typeof getPos === 'function' ? getPos() : undefined;
    if (pos == null) return;
    const { tr } = editor.state;
    tr.setNodeMarkup(pos, undefined, { ...currentNode.attrs, ...attrs });
    editor.view.dispatch(tr);
  }

  function enterEditMode(auto: boolean) {
    if (destroyed || editing) return;
    editing = true;

    const isBlock = currentNode.attrs.variant === 'block';
    const input = isBlock
      ? document.createElement('textarea')
      : document.createElement('input');
    if (!isBlock) (input as HTMLInputElement).type = 'text';
    if (isBlock) (input as HTMLTextAreaElement).rows = 4;
    input.value = currentNode.attrs.instruction;
    input.classList.add('ai-chip__input');

    const commit = () => {
      if (destroyed) return;
      editing = false;
      updateAttributes({ instruction: input.value });
      showDisplay();
    };

    const revert = () => {
      if (destroyed) return;
      editing = false;
      showDisplay();
    };

    input.addEventListener('keydown', ((e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isBlock) {
        e.preventDefault();
        input.removeEventListener('blur', commit);
        commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        input.removeEventListener('blur', commit);
        revert();
      }
    }) as EventListener);

    instructionEl.replaceWith(input);

    if (auto) {
      // Delay focus and blur handler for auto-edit to let ProseMirror's
      // MutationObserver settle — otherwise it steals focus immediately,
      // triggering blur → commit → showDisplay which removes the input.
      setTimeout(() => {
        if (destroyed || !editing) return;
        input.addEventListener('blur', commit);
        input.focus();
      }, 0);
    } else {
      input.addEventListener('blur', commit);
      input.focus();
    }
  }

  function showDisplay() {
    if (destroyed) return;
    instructionEl = createInstructionSpan();
    const existing = dom.querySelector('input, textarea');
    if (existing) {
      existing.replaceWith(instructionEl);
    } else {
      dom.appendChild(instructionEl);
    }
  }

  return {
    dom,
    contentDOM: null,
    update(updatedNode: typeof node) {
      if (updatedNode.type !== currentNode.type) return false;
      currentNode = updatedNode;
      dom.setAttribute('data-variant', currentNode.attrs.variant);
      if (!editing) {
        instructionEl.textContent = currentNode.attrs.instruction;
      }
      return true;
    },
    stopEvent(event: Event) {
      const target = event.target as HTMLElement;
      return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.classList?.contains('ai-chip__toggle')
      );
    },
    ignoreMutation() {
      return true;
    },
    destroy() {
      destroyed = true;
    },
  };
}
