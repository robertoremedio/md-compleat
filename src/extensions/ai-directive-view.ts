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

  let instructionEl = createInstructionSpan();
  dom.appendChild(instructionEl);

  // Auto-enter edit mode for empty instructions
  if (!currentNode.attrs.instruction) {
    queueMicrotask(() => enterEditMode());
  }

  function createInstructionSpan(): HTMLSpanElement {
    const span = document.createElement('span');
    span.classList.add('ai-chip__instruction');
    span.textContent = currentNode.attrs.instruction;
    span.addEventListener('click', enterEditMode);
    return span;
  }

  function updateAttributes(attrs: Record<string, any>) {
    const pos = typeof getPos === 'function' ? getPos() : undefined;
    if (pos == null) return;
    const { tr } = editor.state;
    tr.setNodeMarkup(pos, undefined, { ...currentNode.attrs, ...attrs });
    editor.view.dispatch(tr);
  }

  function enterEditMode() {
    if (destroyed || editing) return;
    editing = true;

    const input = document.createElement('input');
    input.type = 'text';
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

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.removeEventListener('blur', commit);
        commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        input.removeEventListener('blur', commit);
        revert();
      }
    });

    instructionEl.replaceWith(input);
    input.focus();
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
      const target = event.target as Node;
      return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
    },
    ignoreMutation() {
      return true;
    },
    destroy() {
      destroyed = true;
    },
  };
}
