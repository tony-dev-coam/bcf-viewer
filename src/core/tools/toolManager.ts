import * as THREE from 'three';
import { createStore } from '../store';
import type { Engine } from '../engine';

export type ToolId =
  | 'select' | 'marquee'
  | 'length-free' | 'length-edge' | 'area-free' | 'area-rect' | 'area-face' | 'volume'
  | 'clip-plane' | 'clip-box' | 'view-from-plane'
  | 'bcf-pin' | 'color-paint';

export interface Tool {
  activate?(): void;
  deactivate?(): void;
  onClick?(e: PointerEvent): void;
  onDblClick?(e: MouseEvent): void;
  onMove?(e: PointerEvent): void;
  /** Return true when the key was handled. */
  onKey?(e: KeyboardEvent): boolean;
}

export interface Hit { modelId: string; localId: number; point: THREE.Vector3; normal?: THREE.Vector3 }

const CLICK_MOVE_PX = 4; // more movement = orbit drag, not a click

/** One active interaction tool (D6). Routes canvas pointer + global keys; ESC falls back to `select`. */
export function createToolManager(engine: Engine) {
  const tools = new Map<ToolId, Tool>();
  const store = createStore<{ active: ToolId }>({ active: 'select' });
  const dom = engine.world.renderer!.three.domElement;
  const current = () => tools.get(store.getSnapshot().active);

  function activate(id: ToolId) {
    if (id === store.getSnapshot().active) return;
    current()?.deactivate?.();
    store.set({ active: id });
    current()?.activate?.();
  }

  let down: { x: number; y: number } | null = null;
  dom.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  dom.addEventListener('pointerup', (e) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < CLICK_MOVE_PX && e.button === 0) current()?.onClick?.(e);
    down = null;
  });
  dom.addEventListener('pointermove', (e) => current()?.onMove?.(e));
  dom.addEventListener('dblclick', (e) => current()?.onDblClick?.(e));
  window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('input, textarea, [contenteditable="true"]')) return;
    if (current()?.onKey?.(e)) return;
    if (e.key === 'Escape' && store.getSnapshot().active !== 'select') activate('select');
  });

  return {
    store,
    register: (id: ToolId, tool: Tool) => tools.set(id, tool),
    activate,
    exit: () => activate('select'),
    /** Raycast the models under a pointer event. */
    async pick(e: MouseEvent): Promise<Hit | null> {
      const res = await engine.fragments.raycast({
        camera: engine.world.camera.three,
        mouse: new THREE.Vector2(e.clientX, e.clientY),
        dom,
      });
      return res ? { modelId: res.fragments.modelId, localId: res.localId, point: res.point, normal: res.normal } : null;
    },
  };
}

export type ToolManager = ReturnType<typeof createToolManager>;
