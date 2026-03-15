import { Extension } from '@tiptap/core';
import type { AiProvider } from '../ai/provider.js';

export interface AiExecuteOptions {
  shortcut: string;
  getProvider: () => AiProvider;
}

export const AiExecute = Extension.create<AiExecuteOptions>({
  name: 'aiExecute',

  addOptions() {
    return {
      shortcut: 'Mod-Enter',
      getProvider: () => {
        throw new Error('AiExecute: getProvider not configured');
      },
    };
  },

  addStorage() {
    return {
      abortController: null as AbortController | null,
    };
  },

  addKeyboardShortcuts() {
    return {
      [this.options.shortcut]: ({ editor }) => {
        // Prevent duplicate execution
        if (this.storage.abortController) {
          return true;
        }

        // Scan for AI directive nodes
        let hasDirectives = false;
        editor.state.doc.descendants((node) => {
          if (node.type.name === 'aiDirective') {
            hasDirectives = true;
            return false; // stop traversal
          }
        });

        if (!hasDirectives) {
          return false;
        }

        // Serialize and execute
        const markdown = editor.storage.markdown.getMarkdown();
        const controller = new AbortController();
        this.storage.abortController = controller;

        const provider = this.options.getProvider();
        provider
          .execute(markdown, controller.signal)
          .then((result) => {
            if (!editor.isDestroyed) {
              editor.commands.setContent(result);
            }
          })
          .catch((err) => {
            if (err?.name !== 'AbortError') {
              console.error('AiExecute error:', err);
            }
          })
          .finally(() => {
            this.storage.abortController = null;
          });

        return true;
      },

      Escape: () => {
        if (
          this.storage.abortController &&
          !this.storage.abortController.signal.aborted
        ) {
          this.storage.abortController.abort();
          this.storage.abortController = null;
          return true;
        }
        return false;
      },
    };
  },
});
