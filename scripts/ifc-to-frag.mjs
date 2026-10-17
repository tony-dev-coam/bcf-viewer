// Converts IFC files to .frag with the same importer the app uses (src/core/ifc.worker.ts).
// Usage: node --max-old-space-size=12288 scripts/ifc-to-frag.mjs model.ifc [...more.ifc]  (writes model.frag alongside)
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as FRAGS from '@thatopen/fragments';

for (const file of process.argv.slice(2)) {
  const importer = new FRAGS.IfcImporter();
  importer.wasm = { path: resolve('node_modules/web-ifc') + '/', absolute: true };
  const bytes = await importer.process({ bytes: new Uint8Array(readFileSync(file)) });
  const out = file.replace(/\.ifc$/i, '.frag');
  writeFileSync(out, bytes);
  console.log(`${file} -> ${out} (${bytes.length} bytes)`);
}
