import { describe, it, expect } from 'vitest';
import { parseItemData } from './elementInfo';

const v = (value: unknown, type?: string) => ({ value, type });
const storey = { _category: v('IFCBUILDINGSTOREY'), _localId: v(47), Name: v('03 - Floor'), Elevation: v(7.6) };
const slab = {
  _category: v('IFCSLAB'), _localId: v(76489), _guid: v('2UD3D7uxP8kecbbBCRtzEl'),
  Name: v('Floor : Generic 300mm', 'IFCLABEL'), Tag: v('151849'), PredefinedType: v('FLOOR'),
  IsDefinedBy: [
    { _category: v('IFCSLABTYPE'), _localId: v(14193), Name: v('Generic 300mm'),
      HasAssociations: [{ _category: v('IFCMATERIAL'), Name: v('Type Concrete'), Category: v('Concrete') }] },
    { _category: v('IFCPROPERTYSET'), Name: v('Dimensions'), HasProperties: [
      { _category: v('IFCPROPERTYSINGLEVALUE'), Name: v('Area'), NominalValue: v(1549.605686, 'IFCAREAMEASURE') },
      { _category: v('IFCPROPERTYSINGLEVALUE'), Name: v('LoadBearing'), NominalValue: v(true, 'IFCBOOLEAN') },
    ] },
    { _category: v('IFCELEMENTQUANTITY'), Name: v('Qto_SlabBaseQuantities'), Quantities: [
      { _category: v('IFCQUANTITYVOLUME'), Name: v('NetVolume'), VolumeValue: v(464.88) },
    ] },
  ],
  HasAssociations: [
    { _category: v('IFCMATERIALLAYERSETUSAGE'), ForLayerSet: [{ _category: v('IFCMATERIALLAYERSET'), MaterialLayers: [
      { _category: v('IFCMATERIALLAYER'), LayerThickness: v(0.3), Material: [{ _category: v('IFCMATERIAL'), Name: v('Concrete') }] },
    ] }] },
  ],
  ContainedInStructure: [storey],
};

describe('parseItemData (EI-02)', () => {
  const info = parseItemData(slab, 'school_str');

  it('identity: class, GlobalId first, plain attributes, source model', () => {
    expect(info.ifcClass).toBe('IFCSLAB');
    expect(info.attributes[0]).toEqual(['GlobalId', '2UD3D7uxP8kecbbBCRtzEl']);
    expect(info.attributes).toContainEqual(['Name', 'Floor : Generic 300mm']);
    expect(info.attributes).toContainEqual(['Tag', '151849']);
    expect(info.model).toBe('school_str');
  });

  it('property sets with formatted values', () => {
    expect(info.psets).toEqual([{ name: 'Dimensions', rows: [['Area', '1549.606'], ['LoadBearing', 'true']] }]);
  });

  it('quantity sets', () => {
    expect(info.qtos).toEqual([{ name: 'Qto_SlabBaseQuantities', rows: [['NetVolume', '464.88']] }]);
  });

  it('materials from layer set usage and from the type', () => {
    expect(info.materials).toEqual([
      { name: 'IFCMATERIALLAYERSETUSAGE', rows: [['Concrete', '0.3']] },
      { name: 'IFCMATERIAL (type)', rows: [['Type Concrete', 'Concrete']] },
    ]);
  });

  it('relations list related objects by class and name, including the type', () => {
    expect(info.relations).toContainEqual({ name: 'ContainedInStructure', rows: [['IFCBUILDINGSTOREY', '03 - Floor']] });
    expect(info.relations).toContainEqual({ name: 'IsTypedBy', rows: [['IFCSLABTYPE', 'Generic 300mm']] });
    expect(info.relations.find((r) => r.name === 'IsDefinedBy')).toBeUndefined();
  });
});
