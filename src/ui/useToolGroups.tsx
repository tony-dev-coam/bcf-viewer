import { SelectOutlined, ExpandOutlined, AimOutlined, EyeOutlined, UndoOutlined, EyeInvisibleOutlined, BorderInnerOutlined } from '@ant-design/icons';
import { useStore, useViewer } from './viewer';
import type { ToolGroupDef } from './layout/Toolbar';
import type { ToolId } from '../core';
import { S } from './strings';

/** Toolbar sections: interaction tools | view tools | visibility/reset (LY-04). */
export function useToolGroups(): ToolGroupDef[][] {
  const v = useViewer();
  const { active } = useStore(v.tools.store);
  const { count } = useStore(v.selection.store);
  const mode = (id: ToolId, label: string, icon: React.ReactNode) => ({
    key: id, label, icon, active: active === id, kind: 'mode' as const, onClick: () => v.tools.activate(id),
  });
  const cmd = (key: string, label: string, icon: React.ReactNode, onClick: () => void, disabled = false) => ({
    key, label, icon, onClick, disabled, kind: 'command' as const,
  });
  const items = () => v.selection.store.getSnapshot().items;

  return [
    [
      { key: 'selection', label: S.tools.groups.selection, tone: 'interaction', items: [mode('marquee', S.tools.marquee, <BorderInnerOutlined />), mode('select', S.tools.select, <SelectOutlined />)] },
    ],
    [
      {
        key: 'visibility',
        label: S.tools.groups.visibility,
        tone: 'neutral',
        items: [
          cmd('zoom-all', S.tools.zoomToAll, <ExpandOutlined />, () => v.visibility.fitAll()),
          cmd('zoom-sel', S.tools.zoomToSelected, <AimOutlined />, () => v.visibility.fitItems(items()), !count),
          cmd('hide-sel', S.tools.hideSelected, <EyeInvisibleOutlined />, () => v.visibility.hide(items()), !count),
          cmd('show-all', S.tools.showAll, <EyeOutlined />, () => v.visibility.showAll()),
          cmd('reset', S.tools.resetAll, <UndoOutlined />, () => v.resetAll()),
        ],
      },
    ],
  ];
}
