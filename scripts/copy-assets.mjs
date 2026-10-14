// Copies runtime binaries that must be served as static files (not bundled).
import { cpSync, mkdirSync } from 'node:fs';
mkdirSync('public/vendor', { recursive: true });
cpSync('node_modules/web-ifc/web-ifc.wasm', 'public/vendor/web-ifc.wasm');
cpSync('node_modules/@thatopen/fragments/dist/Worker/worker.mjs', 'public/vendor/fragments-worker.mjs');
