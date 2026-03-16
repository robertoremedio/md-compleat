import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Editor, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { AiDirective } from './extensions/ai-directive.js';
import { AiHighlight } from './extensions/ai-highlight.js';
import { AiSuggestion } from './extensions/ai-suggestion.js';
import { AiExecute } from './extensions/ai-execute.js';
import type { AiProvider } from './ai/provider.js';
import { createProvider } from './ai/provider-factory.js';

const LinkShortcut = Extension.create({
  name: 'linkShortcut',

  addKeyboardShortcuts() {
    return {
      'Mod-k': ({ editor }) => {
        const { from, to } = editor.state.selection;
        const hasLink = editor.isActive('link');

        if (hasLink && from === to) {
          // Cursor inside a link with no selection — prompt to edit or remove
          const existingHref =
            editor.getAttributes('link').href ?? '';
          const url = window.prompt('Edit URL (clear to remove):', existingHref);
          if (url === null) return true; // cancelled
          if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
          } else {
            editor
              .chain()
              .focus()
              .extendMarkRange('link')
              .setLink({ href: url })
              .run();
          }
          return true;
        }

        const url = window.prompt('Enter URL:');
        if (url === null || url === '') return true;
        editor.chain().focus().setLink({ href: url }).run();
        return true;
      },
    };
  },
});

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
@customElement('md-compleat')
export class MdCompleat extends LitElement {
  static override styles = css`
    :host {
      --md-compleat-font-family: system-ui, -apple-system, sans-serif;
      --md-compleat-font-mono: ui-monospace, 'SFMono-Regular', 'SF Mono',
        Menlo, Consolas, monospace;
      --md-compleat-max-width: 65ch;
      --md-compleat-max-height: none;
      --md-compleat-focus-outline: 2px solid highlight;
      --md-compleat-code-bg: rgba(0, 0, 0, 0.06);
      --md-compleat-blockquote-border: 3px solid rgba(0, 0, 0, 0.2);
      --md-compleat-hr-color: rgba(0, 0, 0, 0.15);
      --md-compleat-table-border: 1px solid rgba(0, 0, 0, 0.15);
      --md-compleat-link-color: #1a6be0;
      display: block;
    }

    :host(:focus-within) {
      outline: var(--md-compleat-focus-outline);
      outline-offset: -1px;
      border-radius: 2px;
    }

    .editor {
      position: relative;
      font-family: var(--md-compleat-font-family);
      padding: 1rem;
      max-width: var(--md-compleat-max-width);
      max-height: var(--md-compleat-max-height);
      overflow-y: auto;
      box-sizing: border-box;
    }

    .ProseMirror {
      outline: none;
    }

    .ProseMirror p {
      margin: 0.5em 0;
    }

    .ProseMirror > :first-child {
      margin-top: 0;
    }

    /* Headings */
    .ProseMirror h1 {
      font-size: 2em;
      font-weight: 700;
      margin: 0.8em 0 0.4em;
      line-height: 1.2;
    }

    .ProseMirror h2 {
      font-size: 1.5em;
      font-weight: 600;
      margin: 0.7em 0 0.35em;
      line-height: 1.25;
    }

    .ProseMirror h3 {
      font-size: 1.25em;
      font-weight: 600;
      margin: 0.6em 0 0.3em;
      line-height: 1.3;
    }

    .ProseMirror h4,
    .ProseMirror h5,
    .ProseMirror h6 {
      font-size: 1em;
      font-weight: 600;
      margin: 0.5em 0 0.25em;
    }

    /* Code blocks */
    .ProseMirror pre {
      background: var(--md-compleat-code-bg);
      border-radius: 4px;
      padding: 0.75em 1em;
      overflow-x: auto;
      margin: 0.75em 0;
    }

    .ProseMirror pre > code {
      font-family: var(--md-compleat-font-mono);
      font-size: 0.9em;
      background: none;
      padding: 0;
      border-radius: 0;
    }

    /* Inline code */
    .ProseMirror :not(pre) > code {
      font-family: var(--md-compleat-font-mono);
      font-size: 0.9em;
      background: var(--md-compleat-code-bg);
      padding: 0.15em 0.35em;
      border-radius: 3px;
    }

    /* Blockquotes */
    .ProseMirror blockquote {
      border-left: var(--md-compleat-blockquote-border);
      margin: 0.75em 0;
      padding-left: 1em;
      color: rgba(0, 0, 0, 0.65);
    }

    /* Lists */
    .ProseMirror ul,
    .ProseMirror ol {
      padding-left: 1.5em;
      margin: 0.5em 0;
    }

    .ProseMirror li {
      margin: 0.2em 0;
    }

    /* Tables */
    .ProseMirror table {
      border-collapse: collapse;
      width: 100%;
      margin: 0.75em 0;
    }

    .ProseMirror th,
    .ProseMirror td {
      border: var(--md-compleat-table-border);
      padding: 0.4em 0.6em;
      text-align: left;
    }

    .ProseMirror th {
      font-weight: 600;
      background: var(--md-compleat-code-bg);
    }

    /* Horizontal rules */
    .ProseMirror hr {
      border: none;
      border-top: 2px solid var(--md-compleat-hr-color);
      margin: 1.5em 0;
    }

    /* Links */
    .ProseMirror a {
      color: var(--md-compleat-link-color);
      text-decoration: underline;
      cursor: pointer;
    }

    /* Images */
    .ProseMirror img {
      max-width: 100%;
      height: auto;
    }

    /* AI highlight marks */
    mark[data-ai-highlight] {
      background: var(--md-compleat-ai-highlight, rgba(74, 144, 226, 0.15));
      transition: background 0.3s ease;
    }

    /* AI directive chips */
    .ai-chip {
      display: flex;
      align-items: center;
      background: var(--md-compleat-ai-chip-bg, #f0e6ff);
      border-left: 3px solid var(--md-compleat-ai-chip-border, #7c3aed);
      border-radius: 4px;
      padding: 0.5em 0.75em;
      margin: 0.5em 0;
      cursor: pointer;
    }

    .ai-chip__icon {
      color: rgba(0, 0, 0, 0.4);
      margin-right: 0.5em;
      flex-shrink: 0;
    }

    .ai-chip__instruction {
      font-family: var(--md-compleat-font-mono);
      flex: 1;
      word-break: break-word;
    }

    .ai-chip__toggle {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0 0.25em;
      margin-right: 0.25em;
      font-size: 1em;
      color: rgba(0, 0, 0, 0.4);
      flex-shrink: 0;
    }

    .ai-chip__toggle:hover {
      color: rgba(0, 0, 0, 0.7);
    }

    .ai-suggestion {
      position: absolute;
      background: #fff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      padding: 0.5em 0.75em;
      cursor: pointer;
      z-index: 10;
      font-family: var(--md-compleat-font-family);
      font-size: 0.9em;
    }

    .ai-suggestion:hover {
      background: #f0e6ff;
    }

    /* AI execution state */
    .editor.ai-executing {
      overflow: hidden;
      cursor: wait;
    }

    .editor.ai-executing .ProseMirror {
      cursor: wait;
    }

    .editor.ai-executing::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: var(--md-compleat-ai-chip-border, #7c3aed);
      animation: md-compleat-progress 1.5s ease-in-out infinite;
      z-index: 10;
    }

    .editor.ai-executing::after {
      content: 'Press Esc to cancel';
      position: absolute;
      top: 6px;
      right: 8px;
      font-size: 0.75em;
      color: rgba(0, 0, 0, 0.45);
      z-index: 10;
    }

    @keyframes md-compleat-progress {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    .editor.ai-executing .ai-chip {
      animation: md-compleat-pulse 2s ease-in-out infinite;
    }

    @keyframes md-compleat-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0); }
      50% { box-shadow: 0 0 8px 2px rgba(124, 58, 237, 0.3); }
    }

    .ai-error-toast {
      position: absolute;
      top: 8px;
      left: 50%;
      transform: translateX(-50%);
      background: #d32f2f;
      color: #fff;
      padding: 0.5em 1em;
      border-radius: 4px;
      font-size: 0.85em;
      z-index: 20;
      animation: md-compleat-toast-in 0.2s ease-out;
    }

    @keyframes md-compleat-toast-in {
      from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }

    @keyframes md-compleat-success-toast-in {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .editor.ai-completing::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: var(--md-compleat-ai-chip-border, #7c3aed);
      animation: md-compleat-progress-complete 0.3s ease-out forwards;
      z-index: 10;
    }

    @keyframes md-compleat-progress-complete {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }

    .ai-success-toast {
      position: absolute;
      top: 6px;
      right: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75em;
      color: rgba(0, 0, 0, 0.55);
      z-index: 20;
      animation: md-compleat-success-toast-in 0.2s ease-out;
    }

    .ai-success-toast svg {
      width: 14px;
      height: 14px;
      color: #16a34a;
    }

  `;

  @property({ type: String }) content = '';
  @property({ type: String, attribute: 'ai-shortcut' }) aiShortcut = '';
  @property({ type: String, attribute: 'ai-execute-shortcut' }) aiExecuteShortcut = '';
  @property({ type: String, attribute: 'ai-provider' }) aiProviderName = '';
  @property({ type: String, attribute: 'ai-endpoint' }) aiEndpoint = '';
  @property({ type: String, attribute: 'ai-cli-command' }) aiCliCommand = '';
  @property({ type: String, attribute: 'ai-proxy-headers' }) aiProxyHeaders = '';

  @state() private _errorMessage: string | null = null;
  @state() private _showSuccess = false;

  private _editor: Editor | null = null;
  private _updatingFromEditor = false;
  private _aiProvider: AiProvider | null = null;
  private _cachedProvider: AiProvider | null = null;
  private _errorToastTimer: ReturnType<typeof setTimeout> | null = null;
  private _successTimer: ReturnType<typeof setTimeout> | null = null;
  private _boundEscapeHandler = this._handleEscapeCancel.bind(this);

  set aiProvider(provider: AiProvider | null) {
    this._aiProvider = provider;
    this.requestUpdate();
  }

  get aiProvider(): AiProvider | null {
    return this._aiProvider;
  }

  getActiveProvider(): AiProvider {
    if (this._aiProvider) {
      return this._aiProvider;
    }
    if (!this._cachedProvider) {
      this._cachedProvider = createProvider({
        provider: this.aiProviderName,
        endpoint: this.aiEndpoint,
        cliCommand: this.aiCliCommand,
        proxyHeaders: this.aiProxyHeaders,
      });
    }
    return this._cachedProvider;
  }

  override render() {
    return html`<div class="editor"></div>${this._errorMessage
        ? html`<div class="ai-error-toast">${this._errorMessage}</div>`
        : ''}${this._showSuccess
        ? html`<div class="ai-success-toast"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>`
        : ''}`;
  }

  override firstUpdated() {
    this._initEditor();
  }

  override updated(changedProperties: Map<string, unknown>) {
    const aiKeys = ['aiProviderName', 'aiEndpoint', 'aiCliCommand', 'aiProxyHeaders'];
    if (aiKeys.some(k => changedProperties.has(k))) {
      this._cachedProvider = null;
    }
    if (changedProperties.has('content') && this._editor) {
      if (this._updatingFromEditor) {
        this._updatingFromEditor = false;
      } else {
        this._editor.commands.setContent(this.content, { emitUpdate: false });
      }
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    if (!this.style.display) {
      this.style.display = 'block';
    }
    if (this.hasUpdated && !this._editor) {
      this._initEditor();
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this._errorToastTimer) {
      clearTimeout(this._errorToastTimer);
      this._errorToastTimer = null;
    }
    if (this._successTimer) {
      clearTimeout(this._successTimer);
      this._successTimer = null;
    }
    document.removeEventListener('keydown', this._boundEscapeHandler);
    this._editor?.storage.aiExecute?.abortController?.abort();
    this.renderRoot.querySelector('.editor')?.classList.remove('ai-executing');
    this._editor?.destroy();
    this._editor = null;
  }

  private _handleEscapeCancel(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !this._editor) return;
    const storage = this._editor.storage.aiExecute;
    if (storage?.abortController && !storage.abortController.signal.aborted) {
      storage.abortController.abort();
      storage.abortController = null;
      this._editor.setEditable(true, false);
      const element = this.renderRoot.querySelector('.editor');
      element?.classList.remove('ai-executing');
      event.preventDefault();
    }
  }

  getMarkdown(): string {
    if (!this._editor) return '';
    return this._editor.storage.markdown.getMarkdown();
  }

  private _showCompletionSequence(element: Element) {
    element.classList.add('ai-completing');
    // Use setTimeout as fallback since JSDOM doesn't fire animationend
    setTimeout(() => {
      element.classList.remove('ai-completing');
      this._showSuccess = true;
      this._successTimer = setTimeout(() => {
        this._showSuccess = false;
        this._successTimer = null;
      }, 2000);
    }, 300);
  }

  private _initEditor() {
    const element = this.renderRoot.querySelector('.editor');
    if (!element) return;
    this._editor = new Editor({
      element: element as HTMLElement,
      extensions: [
        StarterKit,
        Markdown.configure({
          html: false,
          tightLists: true,
        }),
        Image,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { rel: 'noopener noreferrer' },
        }),
        LinkShortcut,
        Table,
        TableRow,
        TableHeader,
        TableCell,
        AiDirective.configure({
          ...(this.aiShortcut ? { shortcut: this.aiShortcut } : {}),
        }),
        AiHighlight,
        AiSuggestion,
        AiExecute.configure({
          ...(this.aiExecuteShortcut ? { shortcut: this.aiExecuteShortcut } : {}),
          getProvider: () => this.getActiveProvider(),
          onExecutionStateChange: (executing: boolean) => {
            (element as HTMLElement).classList.toggle('ai-executing', executing);
            if (executing) {
              this._showSuccess = false;
              document.addEventListener('keydown', this._boundEscapeHandler);
            } else {
              document.removeEventListener('keydown', this._boundEscapeHandler);
            }
          },
          onError: (error: Error) => {
            if (this._errorToastTimer) {
              clearTimeout(this._errorToastTimer);
            }
            this._errorMessage = error.message;
            this._errorToastTimer = setTimeout(() => {
              this._errorMessage = null;
              this._errorToastTimer = null;
            }, 5000);
          },
        }),
      ],
      content: this.content,
      injectCSS: false,
      onUpdate: ({ editor }) => {
        const newContent = editor.storage.markdown.getMarkdown();
        this._updatingFromEditor = true;
        this.content = newContent;
        this.dispatchEvent(
          new CustomEvent('content-changed', {
            detail: { content: newContent },
            bubbles: true,
            composed: true,
          }),
        );
      },
    });

    this._editor.view.dom.addEventListener('ai-completed', () => {
      this._showCompletionSequence(element);
    });
  }
}
