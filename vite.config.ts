import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es', 'umd'],
      fileName: 'md-compleat',
      name: 'MdCompleat',
    },
    rollupOptions: {
      external: [/^lit/, /^@tiptap\//, 'tiptap-markdown'],
      output: {
        globals: {
          'lit': 'Lit',
          'lit/decorators.js': 'Lit',
          'lit/directives/unsafe-html.js': 'Lit',
          '@tiptap/core': 'TiptapCore',
          '@tiptap/starter-kit': 'TiptapStarterKit',
          '@tiptap/extension-image': 'TiptapExtensionImage',
          '@tiptap/extension-link': 'TiptapExtensionLink',
          '@tiptap/extension-table': 'TiptapExtensionTable',
          '@tiptap/extension-table-row': 'TiptapExtensionTableRow',
          '@tiptap/extension-table-header': 'TiptapExtensionTableHeader',
          '@tiptap/extension-table-cell': 'TiptapExtensionTableCell',
          '@tiptap/pm': 'TiptapPm',
          '@tiptap/pm/state': 'TiptapPmState',
          '@tiptap/pm/transform': 'TiptapPmTransform',
          '@tiptap/pm/history': 'TiptapPmHistory',
          '@tiptap/pm/model': 'TiptapPmModel',
          'tiptap-markdown': 'TiptapMarkdown',
        },
      },
    },
  },
});
