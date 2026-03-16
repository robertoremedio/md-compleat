import { LitElement } from 'lit';
import type { AiProvider } from './ai/provider.js';
/**
 * @cssprop [--md-compleat-font-family=system-ui, -apple-system, sans-serif] - Main font family
 * @cssprop [--md-compleat-font-mono=ui-monospace, 'SFMono-Regular', 'SF Mono', Menlo, Consolas, monospace] - Monospace font family
 * @cssprop [--md-compleat-max-width=65ch] - Maximum width of the editor
 * @cssprop [--md-compleat-max-height=none] - Maximum height of the editor
 * @cssprop [--md-compleat-focus-outline=2px solid highlight] - Focus outline style
 * @cssprop --md-compleat-code-bg - Code block background color (adapts to light/dark)
 * @cssprop --md-compleat-blockquote-border - Blockquote left border (adapts to light/dark)
 * @cssprop --md-compleat-hr-color - Horizontal rule color (adapts to light/dark)
 * @cssprop --md-compleat-table-border - Table border style (adapts to light/dark)
 * @cssprop --md-compleat-link-color - Link color (adapts to light/dark)
 * @cssprop --md-compleat-ai-highlight - AI highlight background (adapts to light/dark)
 * @cssprop --md-compleat-ai-chip-bg - AI directive chip background (adapts to light/dark)
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
