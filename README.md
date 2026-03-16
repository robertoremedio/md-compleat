# md-compleat

WYSIWYG Markdown editor web component with inline AI directives. Built with [Lit](https://lit.dev/) and [Tiptap](https://tiptap.dev/).

## Installation

```bash
npm install md-compleat
```

### Peer Dependencies

md-compleat requires the following peer dependencies:

```bash
npm install lit @tiptap/core @tiptap/starter-kit @tiptap/pm @tiptap/extension-image @tiptap/extension-link @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-header @tiptap/extension-table-cell tiptap-markdown
```

## Basic Usage

```html
<md-compleat content="# Hello World"></md-compleat>
```

```js
import 'md-compleat';

const editor = document.querySelector('md-compleat');
// Get the current markdown content
const markdown = editor.getMarkdown();
```

## UMD / CDN Usage

You can load md-compleat via a script tag. Note that Lit and Tiptap peer dependencies must be loaded separately:

```html
<script src="https://cdn.jsdelivr.net/npm/lit/+esm" type="module"></script>
<script src="https://cdn.jsdelivr.net/npm/md-compleat/dist/md-compleat.umd.cjs"></script>

<md-compleat content="# Hello from CDN"></md-compleat>
```

For full Tiptap support (tables, images, links), use ESM imports instead of UMD.

## Attributes / Properties

| Attribute | Property | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| `content` | `content` | `String` | `''` | Initial markdown content |
| `ai-shortcut` | `aiShortcut` | `String` | `''` | Keyboard shortcut to trigger AI directive insertion |
| `ai-execute-shortcut` | `aiExecuteShortcut` | `String` | `''` | Keyboard shortcut to execute an AI directive |
| `ai-provider` | `aiProviderName` | `String` | `''` | Provider name: `"proxy"` or `"cli"` |
| `ai-endpoint` | `aiEndpoint` | `String` | `''` | Proxy endpoint URL for the proxy provider |
| `ai-cli-command` | `aiCliCommand` | `String` | `''` | CLI command template for the CLI provider |
| `ai-proxy-headers` | `aiProxyHeaders` | `String` | `''` | JSON string of additional headers for the proxy provider |

## Provider Configuration

### Proxy Provider

Send AI requests through an HTTP proxy endpoint:

```html
<md-compleat
  ai-provider="proxy"
  ai-endpoint="https://your-api.example.com/ai"
  ai-proxy-headers='{"Authorization": "Bearer token123"}'
  content="# My Document"
></md-compleat>
```

### CLI Provider

Execute AI requests via a local CLI command:

```html
<md-compleat
  ai-provider="cli"
  ai-cli-command="my-ai-tool --prompt"
  content="# My Document"
></md-compleat>
```

### Custom JS Provider

For full control, set the `aiProvider` property directly or use the `createProvider()` factory:

```js
import { createProvider } from 'md-compleat';

const editor = document.querySelector('md-compleat');

// Option 1: Set a custom provider object
editor.aiProvider = {
  async execute(document, signal) {
    const response = await fetch('/my-api', {
      method: 'POST',
      body: JSON.stringify({ document }),
      signal,
    });
    return response.text();
  }
};

// Option 2: Use the factory for built-in providers
const provider = createProvider({
  provider: 'proxy',
  endpoint: 'https://api.example.com/ai',
});
editor.aiProvider = provider;
```

## Programmatic API

| Method | Returns | Description |
|--------|---------|-------------|
| `getMarkdown()` | `string` | Returns the current editor content as markdown |
| `getActiveProvider()` | `AiProvider` | Returns the currently active AI provider |

| Property | Type | Description |
|----------|------|-------------|
| `aiProvider` | `AiProvider \| null` | Get or set a custom AI provider instance |

## CSS Custom Properties

| Property | Default | Description |
|----------|---------|-------------|
| `--md-compleat-font-family` | `system-ui, -apple-system, sans-serif` | Main font family |
| `--md-compleat-font-mono` | `ui-monospace, 'SFMono-Regular', 'SF Mono', Menlo, Consolas, monospace` | Monospace font family |
| `--md-compleat-max-width` | `65ch` | Maximum width of the editor |
| `--md-compleat-max-height` | `none` | Maximum height of the editor |
| `--md-compleat-focus-outline` | `2px solid highlight` | Focus outline style |
| `--md-compleat-code-bg` | `rgba(0, 0, 0, 0.06)` | Code block background color |
| `--md-compleat-blockquote-border` | `3px solid rgba(0, 0, 0, 0.2)` | Blockquote left border |
| `--md-compleat-hr-color` | `rgba(0, 0, 0, 0.15)` | Horizontal rule color |
| `--md-compleat-table-border` | `1px solid rgba(0, 0, 0, 0.15)` | Table border style |
| `--md-compleat-link-color` | `#1a6be0` | Link color |
| `--md-compleat-ai-highlight` | `rgba(74, 144, 226, 0.15)` | AI highlight background |
| `--md-compleat-ai-chip-bg` | `#f0e6ff` | AI directive chip background |
| `--md-compleat-ai-chip-border` | `#7c3aed` | AI directive chip border color |

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| `content-changed` | `{ content: string }` | Fired when the editor content changes |

## License

ISC
