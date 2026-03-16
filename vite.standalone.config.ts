import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'md-compleat.standalone.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      external: ['node:fs', 'node:path', 'child_process'],
    },
  },
});
