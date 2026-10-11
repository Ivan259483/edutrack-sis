import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Fixed port: the backend's CORS list and the student portal link here.
  server: { port: 5174, strictPort: true },
  preview: { port: 5174, strictPort: true },
});
