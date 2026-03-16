import type { Editor } from '@tiptap/core';
import type { Node } from '@tiptap/pm/model';
/**
 * Parse a markdown string into a ProseMirror Node using the editor's
 * markdown parser and schema, without dispatching any transactions.
 */
export declare function parseMarkdown(editor: Editor, markdown: string): Node;
