import { Button, ColorPicker, Tooltip } from 'antd';
import { ClearOutlined, CheckOutlined } from '@ant-design/icons';
import { useStore, useViewer } from './viewer';
import { S } from './strings';

/** CO-03: floating picker while the paint tool is active. */
export function ColorPaintBar() {
  const v = useViewer();
  const { active } = useStore(v.tools.store);
  const { paintColor, eraser } = useStore(v.color.store);
  if (active !== 'color-paint') return null;
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm dark:bg-neutral-900" role="group" aria-label={S.tools.colorItem}>
      <ColorPicker value={paintColor} disabledAlpha onChange={(c) => v.color.setPaintColor(c.toHexString())} aria-label={S.tools.colorItem} />
      <Tooltip title={S.tools.colorEraser}>
        <Button aria-label={S.tools.colorEraser} aria-pressed={eraser} type={eraser ? 'primary' : 'default'} icon={<ClearOutlined />} onClick={() => v.color.setEraser(!eraser)} />
      </Tooltip>
      <span className="text-xs text-neutral-500">{S.tools.colorHint}</span>
      <Button size="small" icon={<CheckOutlined />} onClick={() => v.tools.exit()}>{S.tools.colorDone}</Button>
    </div>
  );
}
