import type { Editor } from '@tiptap/core';
import { DOMParser as PmDOMParser } from '@tiptap/pm/model';
import type { Node } from '@tiptap/pm/model';

/**
 * Parse a markdown string into a ProseMirror Node using the editor's
 * markdown parser and schema, without dispatching any transactions.
 */
export function parseMarkdown(editor: Editor, markdown: string): Node {
  const markdownStorage = editor.storage.markdown;
  // tiptap-markdown's parser.parse() returns an HTML string
  const htmlString = markdownStorage.parser.parse(markdown);

  // Convert HTML string to a DOM element and parse into ProseMirror doc
  const container = document.createElement('div');
  container.innerHTML = htmlString;

  const parser = PmDOMParser.fromSchema(editor.schema);
  return parser.parse(container);
}
