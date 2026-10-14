import { describe, it, expect } from 'vitest';
import { parseViewpointExtras, extrasXml, bcfToThree, threeToBcf } from './viewpointXml';

const xml = `<VisualizationInfo Guid="vp-1"><Components/>
  <Lines><Line><StartPoint><X>1</X><Y>2</Y><Z>3</Z></StartPoint><EndPoint><X>1</X><Y>2</Y><Z>3</Z></EndPoint></Line>
         <Line><StartPoint><X>0</X><Y>0</Y><Z>0</Z></StartPoint><EndPoint><X>5</X><Y>0</Y><Z>0</Z></EndPoint></Line></Lines>
  <ClippingPlanes><ClippingPlane><Location><X>-23.4</X><Y>15.3</Y><Z>2.2</Z></Location><Direction><X>-1</X><Y>0</Y><Z>0</Z></Direction></ClippingPlane></ClippingPlanes>
</VisualizationInfo>`;

describe('viewpoint XML extras (crais-compatible pins + clipping)', () => {
  it('parses clipping planes and treats zero-length lines as pins', () => {
    expect(parseViewpointExtras(xml)).toEqual({
      guid: 'vp-1',
      planes: [{ location: [-23.4, 15.3, 2.2], direction: [-1, 0, 0] }],
      pin: [1, 2, 3],
    });
  });
  it('axis conversion BCF (Z up) <-> three (Y up) round-trips', () => {
    expect(bcfToThree([1, 2, 3])).toEqual([1, 3, -2]);
    expect(threeToBcf(bcfToThree([1, 2, 3]))).toEqual([1, 2, 3]);
  });
  it('writes Lines then ClippingPlanes (schema order) and parses back', () => {
    const out = extrasXml({ planes: [{ location: [1, 2, 3], direction: [0, 0, 1] }], pin: [4, 5, 6] });
    expect(out.indexOf('<Lines>')).toBeLessThan(out.indexOf('<ClippingPlanes>'));
    expect(parseViewpointExtras(`<VisualizationInfo Guid="g">${out}</VisualizationInfo>`)).toEqual({
      guid: 'g', planes: [{ location: [1, 2, 3], direction: [0, 0, 1] }], pin: [4, 5, 6],
    });
  });
  it('writes nothing when there is nothing to add', () => expect(extrasXml({ planes: [] })).toBe(''));
});
