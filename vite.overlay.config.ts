import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'src/overlay',
  base: './',
  publicDir: path.resolve(__dirname, 'assets'),
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@overlay': path.resolve(__dirname, 'src/overlay'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/overlay'),
    emptyOutDir: true,
  },
  server: {
    port: 5174,
  },
})
