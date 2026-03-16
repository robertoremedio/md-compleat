import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import type { AiProvider } from '../ai/provider.js';

export interface AiExecuteOptions {
  shortcut: string;
  getProvider: () => AiProvider;
  onExecutionStateChange: (executing: boolean) => void;
}

export const AiExecute = Extension.create<AiExecuteOptions>({
  name: 'aiExecute',

  addOptions() {
    return {
      shortcut: 'Mod-Enter',
      getProvider: () => {
        throw new Error('AiExecute: getProvider not configured');
      },
      onExecutionStateChange: () => {},
    };
  },

  addStorage() {
    return {
      abortController: null as AbortController | null,
      onExecutionStateChange: null as ((executing: boolean) => void) | null,
    };
  },

  addKeyboardShortcuts() {
    // Tiptap 3's ext.options getter returns a new object each call,
    // so we resolve the callback into storage on first use to allow
    // runtime overrides (e.g. in tests).
    const notifyStateChange = (executing: boolean) => {
      const cb =
        this.storage.onExecutionStateChange ??
        this.options.onExecutionStateChange;
      cb(executing);
    };

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

        editor.setEditable(false, false);
        notifyStateChange(true);

        const provider = this.options.getProvider();
        provider
          .execute(markdown, controller.signal)
          .then((result) => {
            if (!editor.isDestroyed) {
              editor.setEditable(true, false);
              editor.commands.setContent(result);
            }
          })
          .catch((err) => {
            if (err?.name !== 'AbortError') {
              console.error('AiExecute error:', err);
            }
            if (!editor.isDestroyed) {
              editor.setEditable(true, false);
            }
          })
          .finally(() => {
            if (this.storage.abortController === controller) {
              this.storage.abortController = null;
              notifyStateChange(false);
            }
          });

        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    const ext = this;
    const notifyStateChange = (executing: boolean) => {
      const cb =
        ext.storage.onExecutionStateChange ??
        ext.options.onExecutionStateChange;
      cb(executing);
    };

    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            keydown(_view, event) {
              if (
                event.key === 'Escape' &&
                ext.storage.abortController &&
                !ext.storage.abortController.signal.aborted
              ) {
                ext.storage.abortController.abort();
                ext.storage.abortController = null;
                if (!ext.editor.isDestroyed) {
                  ext.editor.setEditable(true, false);
                }
                notifyStateChange(false);
                event.preventDefault();
                return true;
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});
