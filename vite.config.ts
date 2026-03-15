import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'md-compleat',
    },
    rollupOptions: {
      external: [/^lit/, /^@tiptap\//],
    },
  },
});
