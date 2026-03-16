import { Mark } from '@tiptap/core';
import { AddMarkStep, RemoveMarkStep } from '@tiptap/pm/transform';
import { Plugin } from '@tiptap/pm/state';

export const AiHighlight = Mark.create({
  name: 'aiHighlight',

  parseHTML() {
    return [{ tag: 'mark[data-ai-highlight]' }];
  },

  renderHTML() {
    return [
      'mark',
      {
        'data-ai-highlight': '',
        style:
          'background: var(--md-compleat-ai-highlight, rgba(74, 144, 226, 0.15))',
      },
      0,
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize: { open: '', close: '', mixable: true },
        parse: {},
      },
    };
  },

  addProseMirrorPlugins() {
    const markType = this.type;
    return [
      new Plugin({
        appendTransaction(transactions, _oldState, newState) {
          // Only act when content actually changed (not just marks)
          const hasContentChange = transactions.some(
            (tr) =>
              tr.docChanged &&
              tr.steps.some(
                (step) =>
                  !(step instanceof AddMarkStep) &&
                  !(step instanceof RemoveMarkStep),
              ),
          );
          if (!hasContentChange) return null;

          // Skip if this is a programmatic AI replacement transaction
          const isAiReplacement = transactions.some((tr) =>
            tr.getMeta('aiReplacement'),
          );
          if (isAiReplacement) return null;

          // Skip if this is our own removal transaction
          const isPreventAutoRemove = transactions.some((tr) =>
            tr.getMeta('preventAutoRemove'),
          );
          if (isPreventAutoRemove) return null;

          // Check if any aiHighlight marks exist
          let hasHighlight = false;
          newState.doc.descendants((node) => {
            if (node.marks?.some((m) => m.type === markType)) {
              hasHighlight = true;
              return false;
            }
          });

          if (!hasHighlight) return null;

          // Remove all aiHighlight marks using a single removeMark call
          const tr = newState.tr;
          tr.setMeta('preventAutoRemove', true);
          tr.setMeta('addToHistory', false);
          // Remove marks from each text node individually to avoid
          // tiptap's Delete extension processing RemoveMarkStep at pos 0
          newState.doc.descendants((node, pos) => {
            if (node.isText && node.marks?.some((m) => m.type === markType)) {
              tr.removeMark(pos, pos + node.nodeSize, markType);
            }
          });

          return tr;
        },
      }),
    ];
  },
});
