import * as THREE from 'three';
import CameraControls from 'camera-controls';
import * as OBC from '@thatopen/components';
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

  // Feel matched to the reference viewer's camera presets: low drag smoothing so the model tracks the
  // cursor tightly instead of gliding on, half-speed wheel zoom. That Open's modes reset distances on set().
  const tune = (nav: NavMode) => {
    Object.assign(controls, { smoothTime: 0.15, draggingSmoothTime: 0.05, restThreshold: 0.0025 });
    controls.dollySpeed = nav === 'fly' ? 1 : 0.5;
    controls.azimuthRotateSpeed = controls.polarRotateSpeed = nav === 'fly' ? 0.65 : 1;
    if (nav !== 'fly') controls.maxDistance = 2500;
  };
  tune('orbit');

  // Rotate-drag pivot, ported from the reference viewer's navigation. That Open's `dynamicAnchor` sets a
  // provisional plane pivot and then swaps in the async raycast hit mid-drag, so the pivot visibly jumps.
  // Here the hit is applied once, and dropped if the raycast is too slow to land before the drag is felt.
  const dom = engine.world.renderer!.three.domElement;
  const caster = engine.components.get(OBC.Raycasters).get(engine.world);
  const BUTTONS = ['left', 'middle', 'right'] as const;
  let gesture = 0;
  let activeButton: number | null = null;
  let savedButtons = { ...controls.mouseButtons };
  let rotating = false;
  let pivotReady = false;

  const marker = document.createElement('div'); // 10px orbit-point dot shown while rotating
  marker.style.cssText = 'position:absolute;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:#ff9966;opacity:.75;pointer-events:none;display:none;z-index:1';
  dom.parentElement!.appendChild(marker);
  const pivot = new THREE.Vector3();
  const placeMarker = () => {
    if (marker.style.display === 'none') return;
    const v = pivot.clone().project(camera.three);
    marker.style.left = `${((v.x + 1) / 2) * dom.clientWidth}px`;
    marker.style.top = `${((1 - v.y) / 2) * dom.clientHeight}px`;
  };
  controls.addEventListener('update', placeMarker);

  const setOrbitPointAt = (p: THREE.Vector3) => {
    const { minDistance, maxDistance } = controls;
    Object.assign(controls, { minDistance: Number.EPSILON, maxDistance: Infinity });
    controls.setOrbitPoint(p.x, p.y, p.z);
    Object.assign(controls, { minDistance, maxDistance });
  };

  // setOrbitPoint keeps the view still via a focal offset that setLookAt/fitToSphere never clear, so BCF
  // viewpoints and view presets would land shifted. Fold it into the target (same view, zero offset).
  const bakeFocalOffset = () => {
    const off = controls.getFocalOffset(new THREE.Vector3());
    if (off.lengthSq() === 0) return;
    const cam = camera.three;
    cam.updateMatrixWorld(true);
    const m = cam.matrix;
    const world = new THREE.Vector3()
      .addScaledVector(new THREE.Vector3().setFromMatrixColumn(m, 0), off.x)
      .addScaledVector(new THREE.Vector3().setFromMatrixColumn(m, 1), -off.y)
      .addScaledVector(new THREE.Vector3().setFromMatrixColumn(m, 2), off.z);
    const t = controls.getTarget(new THREE.Vector3()).add(world);
    controls.moveTo(t.x, t.y, t.z, false);
    controls.setFocalOffset(0, 0, 0, false);
  };

  async function anchorAt(ndc: THREE.Vector2, gen: number) {
    const started = performance.now();
    const hit = await caster.castRay({ position: ndc });
    if (gen !== gesture || performance.now() - started > 200) return; // late pivot = jump; keep the old one
    if (hit?.point) return setOrbitPointAt(hit.point);
    if (store.getSnapshot().projection === 'orthographic') return;
    // Missed the model: pick the point on the cursor ray closest to the model bounds.
    const box = sceneBox();
    if (box.isEmpty()) return;
    const rc = new THREE.Raycaster();
    rc.setFromCamera(ndc, camera.three);
    const { ray } = rc;
    if (box.containsPoint(camera.three.position)) return setOrbitPointAt(ray.at(15, new THREE.Vector3()));
    const onRay = ray.closestPointToPoint(box.getCenter(new THREE.Vector3()), new THREE.Vector3());
    const inBox = box.clampPoint(onRay, new THREE.Vector3());
    ray.closestPointToPoint(inBox, onRay);
    setOrbitPointAt(onRay);
  }

  dom.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    if (e.button > 2 || (activeButton !== null && activeButton !== e.button)) return;
    activeButton = e.button;
    savedButtons = { ...controls.mouseButtons };
    rotating = controls.mouseButtons[BUTTONS[e.button]] === CameraControls.ACTION.ROTATE;
    for (const [i, b] of BUTTONS.entries()) if (i !== e.button) controls.mouseButtons[b] = CameraControls.ACTION.NONE;
    controls.mouseButtons.wheel = CameraControls.ACTION.NONE; // one gesture at a time
    if (!rotating || store.getSnapshot().nav === 'fly') return;
    const gen = ++gesture;
    pivotReady = false;
    controls.draggingSmoothTime = 0.025; // tighter tracking while rotating
    const r = dom.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    void anchorAt(ndc, gen).then(() => {
      if (gen !== gesture) return;
      controls.getTarget(pivot);
      pivotReady = true;
    });
  });
  dom.addEventListener('pointermove', () => {
    if (rotating && pivotReady && marker.style.display === 'none') { marker.style.display = 'block'; placeMarker(); }
  });
  const endGesture = () => {
    if (activeButton === null) return;
    activeButton = null;
    Object.assign(controls.mouseButtons, savedButtons);
    marker.style.display = 'none';
    pivotReady = false;
    if (!rotating) return;
    rotating = false;
    const gen = gesture; // not bumped: a quick flick's raycast may still land and set the pivot
    setTimeout(() => {
      if (gen !== gesture || activeButton !== null) return;
      controls.normalizeRotations();
      tune(store.getSnapshot().nav);
      bakeFocalOffset();
    }, 100);
  };
  window.addEventListener('pointerup', endGesture);
  window.addEventListener('pointercancel', endGesture);
  window.addEventListener('blur', endGesture);
  // Zoom through the model only when zooming in; zooming out stays bounded. Capture runs before camera-controls.
  dom.parentElement!.addEventListener('wheel', (e) => {
    if (store.getSnapshot().nav !== 'fly') controls.infinityDolly = e.deltaY < 0;
  }, { capture: true, passive: true });

  async function setNav(nav: NavMode) {
    if (nav === 'fly' && store.getSnapshot().projection !== 'perspective') await setProjection('perspective');
    camera.set(nav === 'fly' ? 'FirstPerson' : 'Orbit');
    tune(nav);
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
