import type { Tool, ToolManager } from './toolManager';
import type { CameraService } from '../services/camera';

/** CA-03: click a surface → camera looks at it perpendicularly; then back to select. */
export function createViewFromPlaneTool(tools: ToolManager, camera: CameraService): Tool {
  return {
    async onClick(e) {
      const hit = await tools.pick(e);
      if (!hit?.normal) return;
      await camera.alignToFace(hit.point, hit.normal);
      tools.exit();
    },
  };
}
