import { Extension } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import { Plugin, PluginKey } from '@tiptap/pm/state';

const aiSuggestionKey = new PluginKey('aiSuggestion');

export const AiSuggestion = Extension.create({
  name: 'aiSuggestion',

  addProseMirrorPlugins() {
    const editor = this.editor;
    let dropdown: HTMLElement | null = null;
    let triggerFrom = -1;

    function getEditorRoot(): HTMLElement {
      return editor.options.element;
    }

    function show(coords: { left: number; top: number; bottom: number }) {
      if (dropdown) return;
      const root = getEditorRoot();

      dropdown = document.createElement('div');
      dropdown.classList.add('ai-suggestion');
      dropdown.textContent = 'Insert AI directive';
      dropdown.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });
      dropdown.addEventListener('click', () => {
        accept();
      });

      // Position relative to the editor container
      const rect = root.getBoundingClientRect();
      dropdown.style.position = 'absolute';
      dropdown.style.left = `${coords.left - rect.left}px`;
      dropdown.style.top = `${coords.bottom - rect.top}px`;

      root.appendChild(dropdown);
    }

    function hide() {
      if (dropdown) {
        dropdown.remove();
        dropdown = null;
      }
      triggerFrom = -1;
    }

    function accept() {
      if (triggerFrom < 0) return;
      const { state } = editor.view;
      const { $from } = state.selection;
      // Replace the entire paragraph containing "/ai" with an aiDirective block
      const blockFrom = $from.before($from.depth);
      const blockTo = $from.after($from.depth);
      const nodeType = state.schema.nodes.aiDirective;
      const node = nodeType.create({ instruction: '', variant: 'self-closing' });
      // Close history group and replace in a single transaction
      const tr = closeHistory(state.tr.replaceWith(blockFrom, blockTo, node));
      editor.view.dispatch(tr);
      hide();
    }

    return [
      new Plugin({
        key: aiSuggestionKey,
        props: {
          handleKeyDown(_view, event) {
            if (!dropdown) return false;
            if (event.key === 'Enter' || event.key === 'Tab') {
              event.preventDefault();
              accept();
              return true;
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              hide();
              return true;
            }
            return false;
          },
        },
        view() {
          return {
            update(view) {
              const { state } = view;
              const { $from } = state.selection;

              // Only trigger at the start of a text block
              const textBefore = $from.parent.textBetween(
                0,
                $from.parentOffset,
                undefined,
                '\ufffc',
              );

              // Must match /ai at the start of the block
              const match = textBefore.match(/^\/ai$/);
              if (match && $from.parentOffset === textBefore.length) {
                const blockStart = $from.start();
                triggerFrom = blockStart;

                if (!dropdown) {
                  let coords: { left: number; top: number; bottom: number };
                  try {
                    coords = view.coordsAtPos($from.pos);
                  } catch {
                    coords = { left: 0, top: 0, bottom: 0 };
                  }
                  show(coords);
                }
              } else {
                hide();
              }
            },
            destroy() {
              hide();
            },
          };
        },
      }),
    ];
  },
});
