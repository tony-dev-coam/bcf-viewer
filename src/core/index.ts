import { createEngine } from './engine';
import { createModelService } from './services/models';
import { createVisibilityService } from './services/visibility';
import { createSelectionService } from './services/selection';
import { createToolManager } from './tools/toolManager';
import { createSelectTool } from './tools/selectTool';
import { createTreeService } from './services/treeService';
import { parseItemData, ITEM_DATA_CONFIG, type ElementInfo } from './services/elementInfo';

export async function createViewer(container: HTMLElement) {
  const engine = await createEngine(container);
  const visibility = createVisibilityService(engine);
  const selection = createSelectionService(engine);
  const tools = createToolManager(engine);
  tools.register('select', createSelectTool(tools, selection, visibility));
  const trees = createTreeService(engine, visibility);
  const models = createModelService(engine, async () => {
    await trees.rebuild();
    await visibility.fitAll();
  });

  return {
    engine,
    models,
    trees,
    visibility,
    selection,
    tools,
    /** EI-01: structured IFC data for one element. */
    async elementInfo(modelId: string, localId: number): Promise<ElementInfo | null> {
      const model = engine.fragments.list.get(modelId);
      if (!model) return null;
      const [data] = await model.getItemsData([localId], ITEM_DATA_CONFIG);
      return data ? parseItemData(data as never, modelId) : null;
    },
    /** VI-03: visibility, tool mode and camera back to default. */
    async resetAll() {
      tools.exit();
      await selection.clear();
      await visibility.showAll();
      await visibility.fitAll();
    },
    dispose: engine.dispose,
  };
}

export type Viewer = Awaited<ReturnType<typeof createViewer>>;
export { hasWebGL2 } from './engine';
export type { Store } from './store';
export type { ToolId } from './tools/toolManager';
export type { ElementInfo, Group, Row } from './services/elementInfo';
export type { TreeNode } from './services/trees';
export { collectItems } from './services/trees';
