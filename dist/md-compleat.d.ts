import { LitElement } from 'lit';
import type { AiProvider } from './ai/provider.js';
/**
 * @cssprop [--md-compleat-font-family=system-ui, -apple-system, sans-serif] - Main font family
 * @cssprop [--md-compleat-font-mono=ui-monospace, 'SFMono-Regular', 'SF Mono', Menlo, Consolas, monospace] - Monospace font family
 * @cssprop [--md-compleat-max-width=65ch] - Maximum width of the editor
 * @cssprop [--md-compleat-max-height=none] - Maximum height of the editor
 * @cssprop [--md-compleat-focus-outline=2px solid highlight] - Focus outline style
 * @cssprop [--md-compleat-code-bg=rgba(0, 0, 0, 0.06)] - Code block background color
 * @cssprop [--md-compleat-blockquote-border=3px solid rgba(0, 0, 0, 0.2)] - Blockquote left border
 * @cssprop [--md-compleat-hr-color=rgba(0, 0, 0, 0.15)] - Horizontal rule color
 * @cssprop [--md-compleat-table-border=1px solid rgba(0, 0, 0, 0.15)] - Table border style
 * @cssprop [--md-compleat-link-color=#1a6be0] - Link color
 * @cssprop [--md-compleat-ai-highlight=rgba(74, 144, 226, 0.15)] - AI highlight background
 * @cssprop [--md-compleat-ai-chip-bg=#f0e6ff] - AI directive chip background
 * @cssprop [--md-compleat-ai-chip-border=#7c3aed] - AI directive chip border color
 */
export declare class MdCompleat extends LitElement {
    static styles: import("lit").CSSResult;
    content: string;
    aiShortcut: string;
    aiExecuteShortcut: string;
    aiProviderName: string;
    aiEndpoint: string;
    aiCliCommand: string;
    aiProxyHeaders: string;
    private _errorMessage;
    private _showSuccess;
    private _editor;
    private _updatingFromEditor;
    private _aiProvider;
    private _cachedProvider;
    private _errorToastTimer;
    private _successTimer;
    private _boundEscapeHandler;
    set aiProvider(provider: AiProvider | null);
    get aiProvider(): AiProvider | null;
    getActiveProvider(): AiProvider;
    render(): import("lit-html").TemplateResult<1>;
    firstUpdated(): void;
    updated(changedProperties: Map<string, unknown>): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private _handleEscapeCancel;
    getMarkdown(): string;
    private _showCompletionSequence;
    private _initEditor;
}
