import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Pre-bundle deps used only inside the IFC worker so the first conversion doesn't trigger a dev reload.
  optimizeDeps: { include: ['@thatopen/fragments', 'three'] },
  worker: { format: 'es' },
  test: { environment: 'jsdom', include: ['src/**/*.test.ts?(x)'] },
});
