import * as THREE from 'three';
import * as OBF from '@thatopen/components-front';
import { createStore } from '../store';
import type { Engine } from '../engine';
import type { Tool, ToolId, ToolManager } from '../tools/toolManager';
import { patchAreaPlane } from '../patches/areaPlane';

patchAreaPlane();

type Measurer = OBF.LengthMeasurement | OBF.AreaMeasurement | OBF.VolumeMeasurement;

const MODES: Partial<Record<ToolId, [kind: 'length' | 'area' | 'volume', mode: string]>> = {
  'length-free': ['length', 'free'],
  'length-edge': ['length', 'edge'],
  'area-free': ['area', 'free'],
  'area-rect': ['area', 'square'],
  'area-face': ['area', 'face'],
  volume: ['volume', 'free'],
};
export const MEASURE_TOOLS = Object.keys(MODES) as ToolId[];

/** ME-01…08: one tool per mode on top of That Open's Length/Area/Volume measurement components. */
export function createMeasureService(engine: Engine, tools: ToolManager) {
  const color = new THREE.Color('#f39a5f');
  const measurers = {
    length: engine.components.get(OBF.LengthMeasurement),
    area: engine.components.get(OBF.AreaMeasurement),
    volume: engine.components.get(OBF.VolumeMeasurement),
  };
  const all = Object.values(measurers) as Measurer[];
  const store = createStore({ count: 0, visible: true });
  const recount = () => store.update({ count: all.reduce((n, m) => n + m.list.size, 0) });

  for (const m of all) {
    m.world = engine.world;
    m.color = color;
    m.units = (m === measurers.length ? 'm' : m === measurers.area ? 'm2' : 'm3') as never; // ME-08 metric
    m.rounding = 2;
    m.enabled = false;
    m.list.onItemAdded.add(recount);
    m.list.onItemDeleted.add(recount);
    m.list.onCleared.add(recount);
  }

  for (const id of MEASURE_TOOLS) {
    const [kind, mode] = MODES[id]!;
    const m = measurers[kind];
    const tool: Tool = {
      activate() {
        m.mode = mode as never;
        m.enabled = true;
      },
      deactivate() {
        m.cancelCreation();
        m.enabled = false;
      },
      onClick: () => void m.create(),
      onDblClick: () => m.endCreation(), // ME-03: double-click finishes a free area
      onKey(e) {
        if (e.key === 'Enter') return m.endCreation(), true;
        if (e.key === 'Delete' || e.key === 'Backspace') return void m.delete(), true; // ME-07: delete hovered
        if (e.key === 'Escape') {
          m.cancelCreation(); // ME-07: cancels an unfinished measurement; tool manager then exits the tool
          return false;
        }
        return false;
      },
    };
    tools.register(id, tool);
  }

  return {
    store,
    deleteAll() {
      for (const m of all) m.list.clear();
    },
    setVisible(visible: boolean) {
      for (const m of all) m.visible = visible;
      store.update({ visible });
    },
  };
}

export type MeasureService = ReturnType<typeof createMeasureService>;
