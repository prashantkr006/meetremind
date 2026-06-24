import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/main/index.ts'),
      formats: ['cjs'],
      fileName: () => 'index.js',
    },
    outDir: 'dist/main',
    emptyOutDir: true,
    rollupOptions: {
      external: [
        'electron',
        'electron-store',
        'keytar',
        'googleapis',
        'google-auth-library',
        '@microsoft/microsoft-graph-client',
        'dotenv',
        'path',
        'fs',
        'os',
        'http',
        'https',
        'url',
        'crypto',
        'stream',
        'util',
        'events',
        'child_process',
        'net',
        'tls',
        'zlib',
        /^node:.*/,
      ],
      output: {
        entryFileNames: '[name].js',
      },
    },
    minify: false,
    sourcemap: true,
    target: 'node20',
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
})
