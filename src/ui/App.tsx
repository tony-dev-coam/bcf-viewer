import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ConfigProvider, Result, Spin } from 'antd';
import { UploadOutlined, ProfileOutlined, ApartmentOutlined } from '@ant-design/icons';
import { createViewer, hasWebGL2, type Viewer } from '../core';
import { ViewerContext } from './viewer';
import { antdTheme, tokens } from './theme';
import { Rail, type PanelId } from './layout/Rail';
import { Dock } from './layout/Dock';
import { FilesPanel } from './panels/FilesPanel';
import { ElementInfoPanel } from './panels/ElementInfoPanel';
import { TreesPanel } from './panels/TreesPanel';
import { WelcomeModal } from './WelcomeModal';
import { Toolbar } from './layout/Toolbar';
import { useToolGroups } from './useToolGroups';
import { ColorPaintBar } from './ColorPaintBar';
import { S } from './strings';

function BottomToolbar() {
  return <Toolbar groups={useToolGroups()} />;
}

const panels: Partial<Record<PanelId, { icon: ReactNode; body: ReactNode }>> = {
  files: { icon: <UploadOutlined />, body: <FilesPanel /> },
  trees: { icon: <ApartmentOutlined />, body: <TreesPanel /> },
  info: { icon: <ProfileOutlined />, body: <ElementInfoPanel /> },
};

export default function App() {
  const container = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [panel, setPanel] = useState<PanelId | null>('trees');
  const [welcome, setWelcome] = useState(true);
  const webgl = hasWebGL2();

  useEffect(() => {
    if (!webgl) return;
    let v: Viewer | undefined;
    let cancelled = false;
    createViewer(container.current!).then((created) => {
      if (cancelled) return created.dispose();
      v = created;
      if (import.meta.env.DEV) Object.assign(window, { __viewer: created }); // e2e/debug hook
      setViewer(created);
    });
    return () => {
      cancelled = true;
      v?.dispose();
    };
  }, [webgl]);

  // Drop files anywhere on the viewport (FM-01).
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (viewer && e.dataTransfer.files.length) viewer.models.load([...e.dataTransfer.files]);
  };

  const active = panel && panels[panel];

  return (
    <ConfigProvider theme={antdTheme(false)}>
      <div className="relative h-full w-full overflow-hidden" style={{ ['--brand' as string]: tokens.primary, ['--accent' as string]: tokens.accent }}>
        <div ref={container} className="absolute inset-0" onDragOver={(e) => e.preventDefault()} onDrop={onDrop} data-testid="viewport" />
        {!webgl && <Result status="warning" title={S.webgl2Missing} />}
        {webgl && !viewer && <Spin className="absolute inset-0 m-auto h-fit" size="large" />}
        {viewer && (
          <ViewerContext.Provider value={viewer}>
            <div className="pointer-events-none absolute inset-3 flex gap-2">
              <div className="pointer-events-auto"><Rail active={panel} onSelect={setPanel} /></div>
              {panel && active && (
                <div className="pointer-events-auto">
                  <Dock title={S.panels[panel]} icon={active.icon}>{active.body}</Dock>
                </div>
              )}
            </div>
            <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
              <div className="pointer-events-auto"><ColorPaintBar /></div>
              <div className="pointer-events-auto"><BottomToolbar /></div>
            </div>
            <WelcomeModal open={welcome} onClose={() => setWelcome(false)} />
          </ViewerContext.Provider>
        )}
      </div>
    </ConfigProvider>
  );
}
