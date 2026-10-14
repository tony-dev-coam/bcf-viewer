// EI-01…03: turn fragments ItemData (a graph of {value,type} attributes + relation arrays) into display groups.
type Attr = { value: unknown; type?: string };
type Item = Record<string, Attr | Item[] | undefined>;

export type Row = [string, string];
export interface Group { name: string; rows: Row[] }
export interface ElementInfo {
  ifcClass: string;
  model: string;
  attributes: Row[];
  psets: Group[];
  qtos: Group[];
  relations: Group[];
  materials: Group[];
}

const isAttr = (x: unknown): x is Attr => !!x && typeof x === 'object' && !Array.isArray(x) && 'value' in x;
const val = (item: Item | undefined, key: string): unknown => {
  const a = item?.[key];
  return isAttr(a) ? a.value : undefined;
};
const list = (item: Item | undefined, key: string): Item[] => {
  const a = item?.[key];
  return Array.isArray(a) ? a : [];
};
const cat = (item: Item) => String(val(item, '_category') ?? '');

export function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000);
  if (Array.isArray(v)) return v.map(formatValue).join(', ');
  return String(v);
}

const QUANTITY_KEYS = ['LengthValue', 'AreaValue', 'VolumeValue', 'CountValue', 'WeightValue', 'TimeValue'];

function propertyValue(p: Item): string {
  for (const k of ['NominalValue', 'EnumerationValues', 'ListValues', 'UpperBoundValue']) {
    const a = p[k];
    if (isAttr(a)) return formatValue(a.value);
    if (Array.isArray(a)) return a.map((x) => formatValue(isAttr(x) ? x.value : x)).join(', ');
  }
  return '';
}

function materialRows(m: Item): Row[] {
  switch (cat(m)) {
    case 'IFCMATERIAL':
      return [[String(val(m, 'Name') ?? ''), formatValue(val(m, 'Category'))]];
    case 'IFCMATERIALLAYERSETUSAGE':
      return list(m, 'ForLayerSet').flatMap(materialRows);
    case 'IFCMATERIALLAYERSET':
      return list(m, 'MaterialLayers').map((l) => [String(val(list(l, 'Material')[0], 'Name') ?? val(l, 'Name') ?? ''), formatValue(val(l, 'LayerThickness'))]);
    case 'IFCMATERIALCONSTITUENTSET':
      return list(m, 'MaterialConstituents').map((c) => [String(val(c, 'Name') ?? ''), String(val(list(c, 'Material')[0], 'Name') ?? '')]);
    case 'IFCMATERIALLIST':
      return list(m, 'Materials').flatMap(materialRows);
    case 'IFCMATERIALPROFILESETUSAGE':
      return list(m, 'ForProfileSet').flatMap(materialRows);
    case 'IFCMATERIALPROFILESET':
      return list(m, 'MaterialProfiles').map((p) => [String(val(list(p, 'Material')[0], 'Name') ?? ''), String(val(p, 'Name') ?? '')]);
    default:
      return [];
  }
}

const materialGroups = (items: Item[], suffix = ''): Group[] =>
  items
    .filter((m) => cat(m).startsWith('IFCMATERIAL'))
    .map((m) => ({ name: cat(m) + suffix, rows: materialRows(m) }))
    .filter((g) => g.rows.length);

export function parseItemData(data: Item, model: string): ElementInfo {
  const definedBy = list(data, 'IsDefinedBy');
  const types = definedBy.filter((d) => cat(d).endsWith('TYPE'));

  const attributes: Row[] = [['GlobalId', formatValue(val(data, '_guid'))]];
  for (const [k, a] of Object.entries(data)) if (!k.startsWith('_') && isAttr(a)) attributes.push([k, formatValue(a.value)]);

  const relations: Group[] = [];
  for (const [k, a] of Object.entries(data)) {
    if (!Array.isArray(a) || k === 'IsDefinedBy' || k === 'HasAssociations') continue;
    relations.push({ name: k, rows: a.map((r) => [cat(r), formatValue(val(r, 'Name'))]) });
  }
  if (types.length) relations.push({ name: 'IsTypedBy', rows: types.map((t) => [cat(t), formatValue(val(t, 'Name'))]) });

  return {
    ifcClass: cat(data),
    model,
    attributes,
    psets: definedBy
      .filter((d) => cat(d) === 'IFCPROPERTYSET')
      .map((p) => ({ name: String(val(p, 'Name') ?? ''), rows: list(p, 'HasProperties').map((h): Row => [String(val(h, 'Name') ?? ''), propertyValue(h)]) })),
    qtos: definedBy
      .filter((d) => cat(d) === 'IFCELEMENTQUANTITY')
      .map((q) => ({
        name: String(val(q, 'Name') ?? ''),
        rows: list(q, 'Quantities').map((x): Row => [String(val(x, 'Name') ?? ''), formatValue(QUANTITY_KEYS.map((k) => val(x, k)).find((n) => n !== undefined))]),
      })),
    relations,
    materials: [...materialGroups(list(data, 'HasAssociations')), ...materialGroups(types.flatMap((t) => list(t, 'HasAssociations')), ' (type)')],
  };
}

const deep = { attributes: true, relations: true };
const flat = { attributes: true, relations: false };

/**
 * Relations to follow. ponytail: one request with the response's shared object graph; a material
 * associated with very many elements makes it heavy — switch to per-relation follow-up requests if that bites.
 */
export const ITEM_DATA_CONFIG = {
  attributesDefault: true,
  relationsDefault: { attributes: false, relations: false },
  relations: {
    IsDefinedBy: deep, HasProperties: flat, Quantities: flat,
    HasAssociations: deep, ForLayerSet: deep, MaterialLayers: deep, Material: flat, MaterialConstituents: deep, Materials: flat,
    ForProfileSet: deep, MaterialProfiles: deep,
    ContainedInStructure: flat, Decomposes: flat, IsDecomposedBy: flat, HasOpenings: flat, FillsVoids: flat,
    ConnectedTo: flat, ConnectedFrom: flat, AssignedToGroups: flat, HasAssignments: flat, ReferencedInStructures: flat,
  },
};
