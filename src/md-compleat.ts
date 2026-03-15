import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
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
import { AiSuggestion } from './extensions/ai-suggestion.js';

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

  `;

  @property({ type: String }) content = '';
  @property({ type: String, attribute: 'ai-shortcut' }) aiShortcut = '';
  @property({ type: String, attribute: 'ai-provider' }) aiProviderName = '';
  @property({ type: String, attribute: 'ai-model' }) aiModel = '';
  @property({ type: String, attribute: 'ai-api-key' }) aiApiKey = '';
  @property({ type: String, attribute: 'ai-endpoint' }) aiEndpoint = '';
  @property({ type: String, attribute: 'ai-cli-command' }) aiCliCommand = '';
  @property({ type: String, attribute: 'ai-proxy-headers' }) aiProxyHeaders = '';

  private _editor: Editor | null = null;
  private _updatingFromEditor = false;

  override render() {
    return html`<div class="editor"></div>`;
  }

  override firstUpdated() {
    this._initEditor();
  }

  override updated(changedProperties: Map<string, unknown>) {
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
    this._editor?.destroy();
    this._editor = null;
  }

  getMarkdown(): string {
    if (!this._editor) return '';
    return this._editor.storage.markdown.getMarkdown();
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
        AiSuggestion,
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
  }
}
