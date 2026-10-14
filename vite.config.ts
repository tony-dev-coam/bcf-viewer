import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { resolve, normalize } from 'node:path';

/** Dev only: serves gitignored local test files (e.g. the reference viewer's examples) at /local-fixtures/. */
function localFixtures(): Plugin {
  const root = resolve(__dirname, 'test-fixtures');
  return {
    name: 'local-fixtures',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/local-fixtures', (req, res, next) => {
        const file = normalize(resolve(root, decodeURIComponent((req.url ?? '').split('?')[0]).replace(/^\/+/, '')));
        if (!file.startsWith(root + '/') || !existsSync(file) || !statSync(file).isFile()) return next(); // no path escape
        res.setHeader('Content-Length', statSync(file).size);
        createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localFixtures()],
  // Pre-bundle deps used only inside the IFC worker so the first conversion doesn't trigger a dev reload.
  optimizeDeps: { include: ['@thatopen/fragments', 'three'] },
  worker: { format: 'es' },
  test: { environment: 'jsdom', include: ['src/**/*.test.ts?(x)'] },
});
