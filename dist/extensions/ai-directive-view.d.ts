import type { NodeViewRendererProps } from '@tiptap/core';
export declare function aiDirectiveNodeView({ node, editor, getPos }: NodeViewRendererProps): {
    dom: HTMLDivElement;
    contentDOM: null;
    update(updatedNode: typeof node): boolean;
    stopEvent(event: Event): boolean;
    ignoreMutation(): boolean;
    destroy(): void;
};
