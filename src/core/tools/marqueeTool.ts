import * as THREE from 'three';
import CameraControls from 'camera-controls';
import type { Tool } from './toolManager';
import type { Engine } from '../engine';
import type { SelectionService } from '../services/selection';
import type { IdMap } from '../services/selectionRules';

/** SE-02: drag a box. Left→right = elements fully inside; right→left = inside or touching. CTRL adds. */
export function createMarqueeTool(engine: Engine, selection: SelectionService): Tool {
  const controls = engine.world.camera.controls;
  const dom = engine.world.renderer!.three.domElement;
  const box = Object.assign(document.createElement('div'), { className: 'marquee-box' });
  Object.assign(box.style, { position: 'fixed', pointerEvents: 'none', border: '1px solid #3b9fd8', background: 'rgba(59,159,216,.12)', display: 'none', zIndex: '5' });
  document.body.appendChild(box);
  let start: { x: number; y: number } | null = null;
  let previousLeft = controls.mouseButtons.left;

  const draw = (x: number, y: number) => {
    if (!start) return;
    const crossing = x < start.x; // right→left
    Object.assign(box.style, {
      display: 'block', left: `${Math.min(start.x, x)}px`, top: `${Math.min(start.y, y)}px`,
      width: `${Math.abs(x - start.x)}px`, height: `${Math.abs(y - start.y)}px`, borderStyle: crossing ? 'dashed' : 'solid',
    });
  };

  return {
    activate() {
      previousLeft = controls.mouseButtons.left;
      controls.mouseButtons.left = CameraControls.ACTION.NONE; // left drag draws the box; right/middle still navigate
    },
    deactivate() {
      controls.mouseButtons.left = previousLeft;
      box.style.display = 'none';
      start = null;
    },
    onPointerDown(e) {
      if (e.button === 0) start = { x: e.clientX, y: e.clientY };
    },
    onMove(e) {
      draw(e.clientX, e.clientY);
    },
    async onPointerUp(e) {
      if (!start) return;
      const s = start;
      start = null;
      box.style.display = 'none';
      if (Math.abs(e.clientX - s.x) < 4 && Math.abs(e.clientY - s.y) < 4) return;
      const fullyIncluded = e.clientX >= s.x;
      const topLeft = new THREE.Vector2(Math.min(s.x, e.clientX), Math.min(s.y, e.clientY));
      const bottomRight = new THREE.Vector2(Math.max(s.x, e.clientX), Math.max(s.y, e.clientY));
      const found: IdMap = {};
      for (const [id, model] of engine.fragments.list) {
        const res = await model.rectangleRaycast({ camera: engine.world.camera.three, dom, topLeft, bottomRight, fullyIncluded });
        if (res?.localIds.length) found[id] = new Set(res.localIds);
      }
      const base = e.ctrlKey || e.metaKey ? selection.store.getSnapshot().items : {};
      const merged: IdMap = {};
      for (const map of [base, found]) for (const [m, ids] of Object.entries(map)) for (const i of ids) (merged[m] ??= new Set()).add(i);
      await selection.set(merged);
    },
    onKey(e) {
      if (e.key !== 'Escape') return false;
      void selection.clear();
      return false; // also leave the tool
    },
  };
}
