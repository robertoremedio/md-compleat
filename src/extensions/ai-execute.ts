import { Extension } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import { Plugin } from '@tiptap/pm/state';
import type { AiProvider } from '../ai/provider.js';
import { getSystemPrompt } from '../ai/prompt.js';
import { parseMarkdown } from '../ai/parse-markdown.js';
import { diffDocs } from '../ai/diff-docs.js';

export interface AiExecuteOptions {
  shortcut: string;
  getProvider: () => AiProvider;
  onExecutionStateChange: (executing: boolean) => void;
  onError: (error: Error, type: string) => void;
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
      onError: () => {},
    };
  },

  addStorage() {
    return {
      abortController: null as AbortController | null,
      onExecutionStateChange: null as ((executing: boolean) => void) | null,
      onError: null as ((error: Error, type: string) => void) | null,
      executeAi: null as (() => boolean) | null,
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

    const notifyError = (error: Error, type: string) => {
      const cb = this.storage.onError ?? this.options.onError;
      cb(error, type);
    };

    const executeAi = (editor: typeof this.editor): boolean => {
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
      const markdown = (editor.storage as any).markdown.getMarkdown();
      const oldDoc = editor.state.doc;
      const controller = new AbortController();
      this.storage.abortController = controller;
      const startTime = Date.now();

      editor.setEditable(false, false);
      notifyStateChange(true);

      const provider = this.options.getProvider();
      const payload = getSystemPrompt() + '\n\n---\n\n' + markdown;
      provider
        .execute(payload, controller.signal)
        .then((result) => {
          if (editor.isDestroyed) return;

          // Validate response type
          if (typeof result !== 'string') {
            const error = new Error('AI returned invalid response');
            editor.setEditable(true, false);
            editor.view.dom.dispatchEvent(
              new CustomEvent('ai-error', {
                bubbles: true,
                composed: true,
                detail: { error, type: 'parse' },
              }),
            );
            notifyError(error, 'parse');
            return;
          }

          // Validate empty response
          if (result.trim() === '') {
            const errorType = 'empty-response';
            const error = new Error('AI returned an empty response');
            editor.setEditable(true, false);
            editor.view.dom.dispatchEvent(
              new CustomEvent('ai-error', {
                bubbles: true,
                composed: true,
                detail: { error, type: errorType },
              }),
            );
            notifyError(error, errorType);
            return;
          }

          try {
            // Parse the AI response into a ProseMirror doc
            const newDoc = parseMarkdown(editor, result);

            // Diff old and new to find changed regions
            const { ranges, charactersChanged } = diffDocs(oldDoc, newDoc);

            // Build a transaction to replace content (single undo step)
            const tr = closeHistory(
              editor.state.tr.replaceWith(
                0,
                editor.state.doc.content.size,
                newDoc.content,
              ),
            );
            tr.setMeta('aiReplacement', true);
            editor.view.dispatch(tr);

            // Apply aiHighlight marks in a separate non-undoable
            // transaction so undo cleanly restores original content
            const aiHighlightMark = editor.schema.marks.aiHighlight;
            if (aiHighlightMark && ranges.length > 0) {
              const markTr = editor.state.tr;
              for (const range of ranges) {
                markTr.addMark(
                  range.from,
                  range.to,
                  aiHighlightMark.create(),
                );
              }
              markTr.setMeta('aiReplacement', true);
              markTr.setMeta('addToHistory', false);
              editor.view.dispatch(markTr);
            }

            // Close history after replacement to prevent next user
            // edit from merging into the same undo group
            editor.view.dispatch(
              closeHistory(editor.state.tr).setMeta('aiReplacement', true),
            );

            // Emit ai-completed event
            const duration = Date.now() - startTime;
            editor.view.dom.dispatchEvent(
              new CustomEvent('ai-completed', {
                bubbles: true,
                composed: true,
                detail: { duration, charactersChanged },
              }),
            );

            editor.setEditable(true, false);
          } catch (parseErr) {
            editor.setEditable(true, false);
            const error =
              parseErr instanceof Error
                ? parseErr
                : new Error(String(parseErr));
            editor.view.dom.dispatchEvent(
              new CustomEvent('ai-error', {
                bubbles: true,
                composed: true,
                detail: { error, type: 'parse' },
              }),
            );
            notifyError(error, 'parse');
          }
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return;
          console.error('AiExecute error:', err);
          if (!editor.isDestroyed) {
            editor.setEditable(true, false);
            const error =
              err instanceof Error ? err : new Error(String(err));
            editor.view.dom.dispatchEvent(
              new CustomEvent('ai-error', {
                bubbles: true,
                composed: true,
                detail: { error, type: 'provider' },
              }),
            );
            notifyError(error, 'provider');
          }
        })
        .finally(() => {
          if (this.storage.abortController === controller) {
            this.storage.abortController = null;
            notifyStateChange(false);
          }
        });

      return true;
    };

    // Expose executeAi on storage so the ProseMirror plugin can call it
    // from the ai-execute-request DOM event handler.
    this.storage.executeAi = () => executeAi(this.editor);

    return {
      [this.options.shortcut]: ({ editor }) => executeAi(editor),
    };
  },

  addProseMirrorPlugins() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
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
