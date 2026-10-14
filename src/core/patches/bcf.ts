import * as OBC from '@thatopen/components';
import { fixColoringForExport } from '../bcf/coloring';
import { extrasXml, type PlaneXml, type V3 } from '../bcf/viewpointXml';

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

type Extras = { planes: PlaneXml[]; pin?: V3 };
let extrasFor: (vpGuid: string) => Extras = () => ({ planes: [] });
/** The BCF service provides clipping planes + pin per viewpoint (BCF space) for export. */
export function setViewpointExtrasProvider(fn: (vpGuid: string) => Extras) {
  extrasFor = fn;
}

/**
 * Upstream gaps (components 3.4.x): Viewpoint.serialize() never writes <ClippingPlanes> or <Lines>, and writes
 * <Coloring> in the 2.1 shape for 3.0. Append our clipping planes + pin (zero-length line, as the reference viewer
 * does) after the camera element and fix <Coloring> for the target schema (see bcf/coloring.ts).
 */
export function patchBcfClippingPlanes() {
  const proto = OBC.Viewpoint.prototype as unknown as { serialize(version?: string): Promise<string>; guid: string };
  const original = proto.serialize;
  proto.serialize = async function (this: typeof proto, version) {
    const target = version ?? (this as unknown as { _components: OBC.Components })._components.get(OBC.BCFTopics).config.version;
    const xml = fixColoringForExport(await original.call(this, version), target);
    const extra = extrasXml(extrasFor(this.guid));
    return extra ? xml.replace(/<\/VisualizationInfo>\s*$/, `${extra}</VisualizationInfo>`) : xml;
  };
}
