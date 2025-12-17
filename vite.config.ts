import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [svelte()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'js',
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: 'plugin.js',
        chunkFileNames: 'plugin-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'plugin.css';
          }
          if (assetInfo.name && /^logo\./i.test(assetInfo.name)) {
            return 'logo[extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  }
});

