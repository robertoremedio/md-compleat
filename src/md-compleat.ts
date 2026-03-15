import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

@customElement('md-compleat')
export class MdCompleat extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .editor {
      font-family: system-ui, -apple-system, sans-serif;
      padding: 1rem;
      max-width: 65ch;
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
  `;

  @property({ type: String }) content = '';

  private _editor: Editor | null = null;
  private _updatingFromEditor = false;

  override render() {
    return html`<div class="editor"></div>`;
  }

  override firstUpdated() {
    this._initEditor();
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('content') && !this._updatingFromEditor && this._editor) {
      this._editor.commands.setContent(this.content, { emitUpdate: false });
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    // Ensure display:block is applied directly for environments
    // where shadow DOM styles aren't computed (e.g. SSR, jsdom)
    if (!this.style.display) {
      this.style.display = 'block';
    }
    // Re-initialize if reconnected after disconnect
    if (this.hasUpdated && !this._editor) {
      this._initEditor();
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._editor?.destroy();
    this._editor = null;
  }

  private _initEditor() {
    const element = this.renderRoot.querySelector('.editor');
    if (!element) return;

    this._editor = new Editor({
      element: element as HTMLElement,
      extensions: [StarterKit],
      content: this.content,
      injectCSS: false,
      onUpdate: ({ editor }) => {
        const newContent = editor.getHTML();
        this._updatingFromEditor = true;
        this.content = newContent;
        this._updatingFromEditor = false;
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
