// BCF schema differences That Open 3.4.x doesn't handle for <Coloring>:
// 2.1: <Color><Component/>…</Color>, Color required.  3.0: <Color><Components><Component/>…</Components></Color>.
const COLOR = /<Color\b([^>]*)>([\s\S]*?)<\/Color>/g;

/** Import: That Open only reads Color.Component, so flatten 3.0's wrapper. */
export const unwrapColorComponents = (xml: string) =>
  xml.replace(COLOR, (_m, attrs: string, body: string) => `<Color${attrs}>${body.replace(/<\/?Components\s*>/g, '')}</Color>`);

export function fixColoringForExport(xml: string, version: string): string {
  if (version === '2.1') return xml.replace(/<Coloring\s*\/>|<Coloring>\s*<\/Coloring>/g, '');
  return xml.replace(COLOR, (m, attrs: string, body: string) => (/<Components\b/.test(body) ? m : `<Color${attrs}><Components>${body.trim()}</Components></Color>`));
}

import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { parseViewpointExtras, type ViewpointExtras } from './viewpointXml';

/**
 * Rewrites viewpoint files (.bcfv) in a BCF zip so That Open's importer reads 3.0 colors, and collects the
 * viewpoint parts it ignores (clipping planes, pins).
 */
export function normalizeBcfForImport(bytes: Uint8Array): { bytes: Uint8Array; extras: ViewpointExtras[] } {
  const files = unzipSync(bytes);
  const extras: ViewpointExtras[] = [];
  let changed = false;
  for (const [name, data] of Object.entries(files)) {
    if (!name.endsWith('.bcfv')) continue;
    const xml = strFromU8(data);
    extras.push(parseViewpointExtras(xml));
    const fixed = unwrapColorComponents(xml);
    if (fixed !== xml) {
      files[name] = strToU8(fixed);
      changed = true;
    }
  }
  return { bytes: changed ? zipSync(files) : bytes, extras };
}
