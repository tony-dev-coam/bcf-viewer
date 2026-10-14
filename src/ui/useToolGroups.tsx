import { EnvironmentOutlined, BgColorsOutlined, FormatPainterOutlined, ClearOutlined, FileOutlined, ScissorOutlined, GatewayOutlined as BoxIcon, StopOutlined, ColumnHeightOutlined, LineOutlined, GatewayOutlined, BorderOutlined, AppstoreOutlined, DeleteOutlined, GlobalOutlined, SendOutlined, RocketOutlined, CodeSandboxOutlined, BlockOutlined, VerticalAlignTopOutlined, VerticalAlignBottomOutlined, BorderOuterOutlined, SelectOutlined, ExpandOutlined, AimOutlined, EyeOutlined, UndoOutlined, EyeInvisibleOutlined, BorderInnerOutlined } from '@ant-design/icons';
import { useStore, useViewer } from './viewer';
import type { ToolGroupDef } from './layout/Toolbar';
import type { ToolId } from '../core';
import { S } from './strings';

/** Toolbar sections: interaction tools | view tools | visibility/reset (LY-04). */
export function useToolGroups(onNewTopicWithPin: () => void): ToolGroupDef[][] {
  const v = useViewer();
  const { active } = useStore(v.tools.store);
  const { count } = useStore(v.selection.store);
  const cam = useStore(v.camera.store);
  const meas = useStore(v.measure.store);
  const clip = useStore(v.clip.store);
  const col = useStore(v.color.store);
  const bcfs = useStore(v.bcf.store);
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
      {
        key: 'measurement', label: S.tools.groups.measurement, tone: 'interaction',
        items: [
          cmd('m-del', S.tools.measurementsDelete, <DeleteOutlined />, () => v.measure.deleteAll(), !meas.count),
          cmd('m-vis', meas.visible ? S.tools.measurementsHide : S.tools.measurementsShow, meas.visible ? <EyeInvisibleOutlined /> : <EyeOutlined />, () => v.measure.setVisible(!meas.visible)),
          mode('volume', S.tools.volume, <AppstoreOutlined />),
          mode('area-face', S.tools.areaFace, <BorderOutlined />),
          mode('area-rect', S.tools.areaRect, <BorderInnerOutlined />),
          mode('area-free', S.tools.areaFree, <GatewayOutlined />),
          mode('length-edge', S.tools.lengthEdge, <LineOutlined />),
          mode('length-free', S.tools.lengthFree, <ColumnHeightOutlined />),
        ],
      },
      {
        key: 'clipping', label: S.tools.groups.clipping, tone: 'interaction',
        items: [
          cmd('c-del', S.tools.clipDelete, <DeleteOutlined />, () => v.clip.deleteAll(), !clip.planes),
          cmd('c-on', clip.enabled ? S.tools.clipDisable : S.tools.clipEnable, clip.enabled ? <StopOutlined /> : <ScissorOutlined />, () => v.clip.setEnabled(!clip.enabled), !clip.planes),
          cmd('c-vis', clip.helpersVisible ? S.tools.clipPlanesHide : S.tools.clipPlanesShow, clip.helpersVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />, () => v.clip.setHelpersVisible(!clip.helpersVisible), !clip.planes),
          mode('clip-box', S.tools.clipBox, <BoxIcon />),
          mode('clip-plane', S.tools.clipPlane, <ScissorOutlined />),
        ],
      },
      {
        key: 'bcf', label: S.tools.groups.bcf, tone: 'interaction',
        items: [
          cmd('pins', bcfs.pinsVisible ? S.tools.bcfPinsHide : S.tools.bcfPinsShow, bcfs.pinsVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />, () => v.bcf.setPinsVisible(!bcfs.pinsVisible)),
          { key: 'bcf-pin', label: S.tools.bcfNewWithPin, icon: <EnvironmentOutlined />, active: active === 'bcf-pin', kind: 'mode' as const, onClick: () => onNewTopicWithPin() },
        ],
      },
    ],
    [
      {
        key: 'navigation', label: S.tools.groups.navigation, tone: 'view',
        items: [
          { key: 'drone', label: S.tools.drone, icon: <RocketOutlined />, active: cam.nav === 'drone', onClick: () => v.camera.setNav('drone') },
          { key: 'fly', label: S.tools.fly, icon: <SendOutlined />, active: cam.nav === 'fly', onClick: () => v.camera.setNav('fly') },
          { key: 'orbit', label: S.tools.orbit, icon: <GlobalOutlined />, active: cam.nav === 'orbit', onClick: () => v.camera.setNav('orbit') },
        ],
      },
      {
        key: 'projection', label: S.tools.groups.projection, tone: 'view',
        items: [
          cmd('top', S.tools.topView, <VerticalAlignTopOutlined />, () => v.camera.topView()),
          cmd('bottom', S.tools.bottomView, <VerticalAlignBottomOutlined />, () => v.camera.bottomView()),
          mode('view-from-plane', S.tools.viewFromPlane, <BorderOuterOutlined />),
          { key: 'ortho', label: S.tools.orthographic, icon: <BlockOutlined />, active: cam.projection === 'orthographic', onClick: () => v.camera.setProjection('orthographic') },
          { key: 'persp', label: S.tools.perspective, icon: <CodeSandboxOutlined />, active: cam.projection === 'perspective', onClick: () => v.camera.setProjection('perspective') },
        ],
      },
      {
        key: 'color', label: S.tools.groups.color, tone: 'view',
        items: [
          cmd('col-clear', S.tools.colorClear, <ClearOutlined />, () => v.color.clearCustom(), !Object.keys(col.custom).length),
          mode('color-paint', S.tools.colorItem, <FormatPainterOutlined />),
          { key: 'white', label: S.tools.colorWhite, icon: <FileOutlined />, active: col.mode === 'white' && active !== 'color-paint', onClick: () => v.color.setMode('white') },
          { key: 'orig', label: S.tools.colorOriginal, icon: <BgColorsOutlined />, active: col.mode === 'original' && active !== 'color-paint', onClick: () => v.color.setMode('original') },
        ],
      },
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
