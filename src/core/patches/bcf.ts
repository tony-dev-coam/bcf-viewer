import * as OBC from '@thatopen/components';
import { fixColoringForExport } from '../bcf/coloring';

/**
 * Upstream bug (components 3.4.x): Viewpoint.createComponentTags() with includeSelectionTag=false writes
 * `selectionComponents` for both <Selection> and <Exceptions>, so visibility exceptions are lost on BCF export.
 * Found by spike S1 (round-trip of buildingSMART test cases). Remove when fixed upstream.
 */
export function patchBcfExceptions() {
  const proto = OBC.Viewpoint.prototype as unknown as {
    createComponentTags(from: 'selection' | 'exception'): Promise<string>;
    selectionComponents: Iterable<string>;
    exceptionComponents: Iterable<string>;
    _components: OBC.Components;
  };
  const original = proto.createComponentTags;
  proto.createComponentTags = async function (this: typeof proto, from) {
    if (this._components.get(OBC.BCFTopics).config.includeSelectionTag) return original.call(this, from);
    const guids = from === 'selection' ? this.selectionComponents : this.exceptionComponents;
    return [...guids].map((g) => `<Component IfcGuid="${g}" />`).join('\n');
  };
}

/**
 * Upstream gap (components 3.4.x): Viewpoint.serialize() never writes <ClippingPlanes>, although import reads
 * them. Insert them after the camera element. Also fixes <Coloring> to the target schema (see bcf/coloring.ts) (BCF schema order: Components, Camera, Lines, ClippingPlanes, Bitmaps).
 */
export function patchBcfClippingPlanes() {
  type Vec = { x: number; y: number; z: number };
  const proto = OBC.Viewpoint.prototype as unknown as {
    serialize(version?: string): Promise<string>;
    toJSON(): { clipping_planes?: { location: Vec; direction: Vec }[] };
  };
  const original = proto.serialize;
  proto.serialize = async function (this: typeof proto, version) {
    const target = version ?? (this as unknown as { _components: OBC.Components })._components.get(OBC.BCFTopics).config.version;
    const xml = fixColoringForExport(await original.call(this, version), target);
    const planes = this.toJSON().clipping_planes ?? [];
    if (!planes.length) return xml;
    const v = (tag: string, p: Vec) => `<${tag}><X>${p.x}</X><Y>${p.y}</Y><Z>${p.z}</Z></${tag}>`;
    const tags = planes.map((p) => `<ClippingPlane>${v('Location', p.location)}${v('Direction', p.direction)}</ClippingPlane>`).join('');
    return xml.replace(/<\/VisualizationInfo>\s*$/, `<ClippingPlanes>${tags}</ClippingPlanes></VisualizationInfo>`);
  };
}
