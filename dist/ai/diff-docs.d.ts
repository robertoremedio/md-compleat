import type { Node } from '@tiptap/pm/model';
export interface DiffResult {
    ranges: Array<{
        from: number;
        to: number;
    }>;
    charactersChanged: number;
}
/**
 * Compare two ProseMirror documents and return ranges in the new document
 * where content differs from the old document.
 */
export declare function diffDocs(oldDoc: Node, newDoc: Node): DiffResult;
