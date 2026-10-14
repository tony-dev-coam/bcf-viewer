// BCF viewpoint parts That Open 3.4 drops: <ClippingPlanes> (not created on import, not written on export)
// and <Lines>. Pins are stored like the reference viewer does: a zero-length <Line> (start = end).
// Coordinates here are BCF space (Z up). Direction follows the BCF spec: it points to the clipped side.
export type V3 = [number, number, number];
export interface PlaneXml { location: V3; direction: V3 }
export interface ViewpointExtras { guid: string; planes: PlaneXml[]; pin?: V3 }

const num = (s: string, tag: string) => Number(new RegExp(`<${tag}>\\s*([^<]+)\\s*</${tag}>`).exec(s)?.[1]);
const vec = (s: string, tag: string): V3 | null => {
  const body = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(s)?.[1];
  if (!body) return null;
  const v: V3 = [num(body, 'X'), num(body, 'Y'), num(body, 'Z')];
  return v.every(Number.isFinite) ? v : null;
};
const blocks = (s: string, tag: string) => [...s.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => m[1]);
const same = (a: V3, b: V3) => a.every((x, i) => Math.abs(x - b[i]) < 1e-9);

export function parseViewpointExtras(xml: string): ViewpointExtras {
  const guid = /<VisualizationInfo[^>]*\bGuid="([^"]+)"/.exec(xml)?.[1] ?? '';
  const planes = blocks(xml, 'ClippingPlane')
    .map((b) => ({ location: vec(b, 'Location'), direction: vec(b, 'Direction') }))
    .filter((p): p is PlaneXml => !!p.location && !!p.direction);
  let pin: V3 | undefined;
  for (const line of blocks(xml, 'Line')) {
    const a = vec(line, 'StartPoint'), b = vec(line, 'EndPoint');
    if (a && b && same(a, b)) { pin = a; break; }
  }
  return pin ? { guid, planes, pin } : { guid, planes };
}

const xyz = (tag: string, [x, y, z]: V3) => `<${tag}><X>${x}</X><Y>${y}</Y><Z>${z}</Z></${tag}>`;

/** XML to append after the camera element: Lines, then ClippingPlanes (BCF schema order). */
export function extrasXml({ planes, pin }: { planes: PlaneXml[]; pin?: V3 }): string {
  const lines = pin ? `<Lines><Line>${xyz('StartPoint', pin)}${xyz('EndPoint', pin)}</Line></Lines>` : '';
  const clips = planes.length
    ? `<ClippingPlanes>${planes.map((p) => `<ClippingPlane>${xyz('Location', p.location)}${xyz('Direction', p.direction)}</ClippingPlane>`).join('')}</ClippingPlanes>`
    : '';
  return lines + clips;
}

/** BCF (x, y, z) with Z up → three.js (x, z, -y) with Y up; and back. Same mapping That Open uses for cameras. */
export const bcfToThree = ([x, y, z]: V3): V3 => [x, z, -y];
export const threeToBcf = ([x, y, z]: V3): V3 => [x, -z, y];
