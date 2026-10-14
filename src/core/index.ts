import { createEngine } from './engine';
import { createModelService } from './services/models';
import { createVisibilityService } from './services/visibility';

export async function createViewer(container: HTMLElement) {
  const engine = await createEngine(container);
  const visibility = createVisibilityService(engine);
  const models = createModelService(engine, () => visibility.fitAll());
  return { engine, models, visibility, dispose: engine.dispose };
}

export type Viewer = Awaited<ReturnType<typeof createViewer>>;
export { hasWebGL2 } from './engine';
export type { Store } from './store';
