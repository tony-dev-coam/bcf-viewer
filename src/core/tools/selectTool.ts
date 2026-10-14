import type { Tool, ToolManager } from './toolManager';
import type { SelectionService } from '../services/selection';
import type { VisibilityService } from '../services/visibility';

/** SE-01 + NV-04: click select, CTRL add, ESC clear, dbl-click element = select+isolate, dbl-click empty = fit all. */
export function createSelectTool(tools: ToolManager, selection: SelectionService, visibility: VisibilityService): Tool {
  return {
    async onClick(e) {
      const hit = await tools.pick(e);
      await selection.applyPick(hit, e.ctrlKey || e.metaKey);
    },
    async onDblClick(e) {
      const hit = await tools.pick(e);
      if (!hit) return visibility.fitAll();
      await selection.applyPick(hit, false);
      await visibility.isolate(selection.store.getSnapshot().items);
    },
    onKey(e) {
      if (e.key !== 'Escape') return false;
      selection.clear();
      return true;
    },
  };
}
