import * as THREE from 'three';
import CameraControls from 'camera-controls';
import { createStore } from '../store';
import type { Engine } from '../engine';

export type NavMode = 'orbit' | 'fly' | 'drone';
export type Projection = 'perspective' | 'orthographic';

const MOVE_KEYS: Record<string, [forward: number, right: number]> = {
  KeyW: [1, 0], ArrowUp: [1, 0], KeyS: [-1, 0], ArrowDown: [-1, 0],
  KeyA: [0, -1], ArrowLeft: [0, -1], KeyD: [0, 1], ArrowRight: [0, 1],
};

/** NV-01…03, CA-01…03. */
export function createCameraService(engine: Engine) {
  const camera = engine.world.camera;
  const controls = camera.controls;
  const store = createStore<{ nav: NavMode; projection: Projection }>({ nav: 'orbit', projection: 'perspective' });

  const sceneBox = () => {
    const box = new THREE.Box3();
    for (const [, m] of engine.fragments.list) box.union(m.box);
    return box;
  };

  // NV-02 fly: keyboard movement while keys are held. Speed scales with model size; SHIFT = faster.
  const held = new Set<string>();
  let shift = false;
  let raf = 0;
  let last = 0;
  const step = (t: number) => {
    const dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    const size = sceneBox().getSize(new THREE.Vector3()).length() || 50;
    const speed = (size / 15) * (shift ? 3 : 1) * dt;
    let f = 0, r = 0;
    for (const k of held) { f += MOVE_KEYS[k][0]; r += MOVE_KEYS[k][1]; }
    if (f) controls.forward(f * speed, false);
    if (r) controls.truck(r * speed, 0, false);
    raf = held.size ? requestAnimationFrame(step) : 0;
  };
  window.addEventListener('keydown', (e) => {
    shift = e.shiftKey;
    if (store.getSnapshot().nav !== 'fly' || !(e.code in MOVE_KEYS)) return;
    if ((e.target as HTMLElement).closest('input, textarea, [contenteditable="true"]')) return;
    e.preventDefault();
    held.add(e.code);
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); }
  });
  window.addEventListener('keyup', (e) => { shift = e.shiftKey; held.delete(e.code); });
  window.addEventListener('blur', () => held.clear());

  async function setNav(nav: NavMode) {
    if (nav === 'fly' && store.getSnapshot().projection !== 'perspective') await setProjection('perspective');
    camera.set(nav === 'fly' ? 'FirstPerson' : 'Orbit');
    // ponytail: drone = orbit with left-drag pan (screen-space) instead of rotate.
    controls.mouseButtons.left = nav === 'drone' ? CameraControls.ACTION.TRUCK : CameraControls.ACTION.ROTATE;
    controls.mouseButtons.right = nav === 'drone' ? CameraControls.ACTION.ROTATE : CameraControls.ACTION.TRUCK;
    store.update({ nav });
  }

  async function setProjection(projection: Projection) {
    if (projection === 'orthographic' && store.getSnapshot().nav === 'fly') await setNav('orbit');
    await camera.projection.set(projection === 'perspective' ? 'Perspective' : 'Orthographic');
    store.update({ projection });
  }

  async function lookFrom(dir: THREE.Vector3) {
    const box = sceneBox();
    if (box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const c = sphere.center;
    const p = c.clone().addScaledVector(dir.normalize(), sphere.radius * 2.5);
    await controls.setLookAt(p.x, p.y, p.z, c.x, c.y, c.z, true);
    await controls.fitToSphere(sphere, true);
  }

  return {
    store,
    setNav,
    setProjection,
    // Tiny horizontal offset keeps camera-controls' up vector stable when looking straight down/up.
    topView: () => lookFrom(new THREE.Vector3(0, 1, 0.0001)),
    bottomView: () => lookFrom(new THREE.Vector3(0, -1, 0.0001)),
    /** CA-03: look at a clicked surface along its normal, keeping the current distance. */
    async alignToFace(point: THREE.Vector3, normal: THREE.Vector3) {
      const pos = point.clone().addScaledVector(normal.clone().normalize(), Math.max(controls.distance, 5));
      await controls.setLookAt(pos.x, pos.y, pos.z, point.x, point.y, point.z, true);
    },
    /** After something else (BCF viewpoint) switched the projection. */
    syncProjection() {
      store.update({ projection: camera.projection.current === 'Orthographic' ? 'orthographic' : 'perspective' });
      if (store.getSnapshot().projection === 'orthographic' && store.getSnapshot().nav === 'fly') void setNav('orbit');
    },
    async reset() {
      await setNav('orbit');
    },
  };
}

export type CameraService = ReturnType<typeof createCameraService>;
