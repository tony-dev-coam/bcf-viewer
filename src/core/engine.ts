import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as OBF from '@thatopen/components-front';

export type World = OBC.SimpleWorld<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBF.PostproductionRenderer>;

export interface Engine {
  components: OBC.Components;
  world: World;
  fragments: OBC.FragmentsManager;
  dispose(): void;
}

export function hasWebGL2(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

/** Boots That Open: one world (scene + ortho/persp camera + postproduction renderer), fragments worker, IFC loader. */
export async function createEngine(container: HTMLElement): Promise<Engine> {
  const components = new OBC.Components();
  const world = components.get(OBC.Worlds).create<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBF.PostproductionRenderer>();

  world.scene = new OBC.SimpleScene(components);
  world.scene.setup();
  world.scene.three.background = null;
  world.renderer = new OBF.PostproductionRenderer(components, container);
  world.renderer.showLogo = false;
  world.camera = new OBC.OrthoPerspectiveCamera(components);
  await world.camera.controls.setLookAt(60, 40, 60, 0, 0, 0);
  components.init();
  components.get(OBC.Raycasters).get(world);

  const fragments = components.get(OBC.FragmentsManager);
  fragments.init('/vendor/fragments-worker.mjs');

  // Stream/cull tiles for the current view whenever the camera settles.
  world.camera.controls.addEventListener('rest', () => fragments.core.update(true));
  world.camera.projection.onChanged.add(() => {
    for (const [, model] of fragments.list) model.useCamera(world.camera.three);
  });
  fragments.list.onItemSet.add(({ value: model }) => {
    model.useCamera(world.camera.three);
    world.scene.three.add(model.object);
    fragments.core.update(true);
  });
  // Avoid z-fighting between coplanar faces of federated models.
  fragments.core.models.materials.list.onItemSet.add(({ value: material }) => {
    if (!('isLodMaterial' in material && material.isLodMaterial)) {
      material.polygonOffset = true;
      material.polygonOffsetUnits = 1;
      material.polygonOffsetFactor = Math.random();
    }
  });

  // Federated models are placed relative to the first loaded model's coordinate system.
  fragments.core.settings.autoCoordinate = true;

  return {
    components,
    world,
    fragments,
    dispose: () => components.dispose(),
  };
}

export { THREE };
