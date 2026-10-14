import { describe, it, expect } from 'vitest';
import { unwrapColorComponents, fixColoringForExport } from './coloring';

const v3 = `<Coloring><Color Color="FF0000"><Components><Component IfcGuid="a"/><Component IfcGuid="b"/></Components></Color></Coloring>`;
const flat = `<Coloring><Color Color="FF0000"><Component IfcGuid="a"/><Component IfcGuid="b"/></Color></Coloring>`;

describe('BCF coloring XML', () => {
  it('import: unwraps 3.0 <Components> inside <Color> (That Open reads Color.Component)', () => {
    expect(unwrapColorComponents(v3)).toBe(flat);
    expect(unwrapColorComponents(flat)).toBe(flat);
  });
  it('export 3.0: wraps components in <Components> as the 3.0 schema requires', () => {
    expect(fixColoringForExport(flat, '3')).toBe(v3);
    expect(fixColoringForExport(v3, '3')).toBe(v3);
  });
  it('export 2.1: keeps flat components and drops an empty <Coloring/> (invalid in 2.1)', () => {
    expect(fixColoringForExport(flat, '2.1')).toBe(flat);
    expect(fixColoringForExport('<a/><Coloring /><b/>', '2.1')).toBe('<a/><b/>');
    expect(fixColoringForExport('<Coloring>\n</Coloring>', '2.1')).toBe('');
  });
});
