import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    port: 3000,
    strictPort: true,
    open: false,
    host: '0.0.0.0',
    watch: {
      ignored: [
        '**/images_for_debug/**',
        '**/archive_html/**',
        '**/.git/**',
        '**/android/**'
      ]
    }
  }
});
