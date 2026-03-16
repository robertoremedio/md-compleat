import type { Node } from '@tiptap/pm/model';

export interface DiffResult {
  ranges: Array<{ from: number; to: number }>;
  charactersChanged: number;
}

/**
 * Compare two ProseMirror documents and return ranges in the new document
 * where content differs from the old document.
 */
export function diffDocs(oldDoc: Node, newDoc: Node): DiffResult {
  const oldContent = oldDoc.content;
  const newContent = newDoc.content;

  const start = oldContent.findDiffStart(newContent);

  // Identical documents
  if (start === null || start === undefined) {
    return { ranges: [], charactersChanged: 0 };
  }

  const diffEnd = oldContent.findDiffEnd(newContent);
  if (!diffEnd) {
    return { ranges: [], charactersChanged: 0 };
  }

  // findDiffEnd returns { a: posInOld, b: posInNew }
  let endOld = diffEnd.a;
  let endNew = diffEnd.b;

  // Ensure start doesn't exceed end positions
  if (start > endNew) {
    endNew = start;
  }
  if (start > endOld) {
    endOld = start;
  }

  // The changed region in the new doc is [start, endNew]
  const newSize = endNew - start;
  const oldSize = endOld - start;

  // If only content was removed (new region is empty), nothing to highlight
  if (newSize <= 0) {
    return { ranges: [], charactersChanged: 0 };
  }

  // Clamp to document bounds
  const clampedFrom = Math.max(0, start);
  const clampedTo = Math.min(endNew, newDoc.content.size);

  if (clampedFrom >= clampedTo) {
    return { ranges: [], charactersChanged: 0 };
  }

  const charactersChanged = Math.max(newSize, oldSize);

  return {
    ranges: [{ from: clampedFrom, to: clampedTo }],
    charactersChanged,
  };
}
