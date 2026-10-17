import { useEffect, useRef, useState, type ReactNode } from 'react';
import { App as AntApp, ConfigProvider, Result, Spin } from 'antd';
import { UploadOutlined, ProfileOutlined, ApartmentOutlined, CommentOutlined, QuestionOutlined, SettingOutlined } from '@ant-design/icons';
import { createViewer, hasWebGL2, type Viewer } from '../core';
import { ViewerContext, useStore, useViewer } from './viewer';
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
import { RadialMenu } from './RadialMenu';
import { BcfListPanel } from './bcf/BcfListPanel';
import { BcfTopicPanel } from './bcf/BcfTopicPanel';
import { PinsLayer } from './bcf/PinsLayer';
import { AuthorDialog } from './bcf/AuthorDialog';
import { useConfirmDiscard } from './bcf/useConfirmDiscard';
import { SettingsPanel } from './panels/SettingsPanel';
import { HelpPanel } from './panels/HelpPanel';
import { createStore } from '../core/store';
import { S } from './strings';

const LIGHT = createStore({ theme: 'light' as 'light' | 'dark' });

type DockPanel = Exclude<PanelId, 'topic'>;

interface ShellProps {
  viewport: React.RefObject<HTMLDivElement | null>;
}

function Shell({ viewport }: ShellProps) {
  const viewer = useViewer();
  const { active, session, author } = useStore(viewer.bcf.store);
  const [panel, setPanel] = useState<DockPanel | null>('trees');
  const [topicOpen, setTopicOpen] = useState(false);
  const [welcome, setWelcome] = useState(true);
  const [authorThen, setAuthorThen] = useState<null | (() => void)>(null);
  const confirmDiscard = useConfirmDiscard();
  const groups = useToolGroups(() => withAuthor(async () => { if (await confirmDiscard()) viewer.bcf.placePin(null); }));

  // A topic becoming active or a new session opens the floating BCF Topic card.
  useEffect(() => { if (active || session) setTopicOpen(true); }, [active?.guid, !!session]);

  function withAuthor(fn: () => void) {
    if (author) fn();
    else setAuthorThen(() => fn);
  }
  const openTopic = async (guid: string) => {
    if (active?.guid !== guid && !(await confirmDiscard())) return;
    await viewer.bcf.openTopic(guid);
    setTopicOpen(true);
  };

  const panels: Record<DockPanel, { icon: ReactNode; body: ReactNode } | undefined> = {
    files: { icon: <UploadOutlined />, body: <FilesPanel /> },
    trees: { icon: <ApartmentOutlined />, body: <TreesPanel /> },
    info: { icon: <ProfileOutlined />, body: <ElementInfoPanel /> },
    bcf: { icon: <CommentOutlined />, body: <BcfListPanel onOpenTopic={() => setTopicOpen(true)} /> },
    help: { icon: <QuestionOutlined />, body: <HelpPanel /> },
    settings: { icon: <SettingOutlined />, body: <SettingsPanel /> },
  };
  const dock = panel && panels[panel];

  return (
    <>
      <PinsLayer onOpen={openTopic} />
      <RadialMenu viewport={viewport} groups={groups} />
      <div className="pointer-events-none absolute inset-3 flex items-start gap-2">
        <div className="pointer-events-auto h-full">
          <Rail
            active={panel}
            topicOpen={topicOpen}
            onSelect={(p) => (p === 'topic' ? setTopicOpen((o) => !o) : setPanel(p))}
          />
        </div>
        {dock && panel && (
          <div className="pointer-events-auto h-full">
            <Dock title={S.panels[panel]} icon={dock.icon}>{dock.body}</Dock>
          </div>
        )}
        {topicOpen && (
          <div className="pointer-events-auto max-h-full">
            <BcfTopicPanel onClose={() => setTopicOpen(false)} />
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
        <div className="pointer-events-auto"><ColorPaintBar /></div>
        <div className="pointer-events-auto"><Toolbar groups={groups} /></div>
      </div>
      <WelcomeModal open={welcome} onClose={() => setWelcome(false)} />
      <AuthorDialog open={!!authorThen} onClose={(saved) => { const next = authorThen; setAuthorThen(null); if (saved) next?.(); }} />
    </>
  );
}

export default function App() {
  const container = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const webgl = hasWebGL2();
  const { theme } = useStore<{ theme: 'light' | 'dark' }>(viewer?.settings.store ?? LIGHT);
  const dark = theme === 'dark';
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);

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

  // Drop files anywhere on the viewport (FM-01); BCF files go to BCF import.
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!viewer) return;
    const files = [...e.dataTransfer.files];
    const bcf = files.filter((f) => /\.bcf(zip)?$/i.test(f.name));
    if (files.length > bcf.length) viewer.models.load(files.filter((f) => !bcf.includes(f)));
    for (const f of bcf) void viewer.bcf.importFile(f);
  };

  return (
    <ConfigProvider theme={antdTheme(dark)}>
      <AntApp className="h-full">
        <div className="relative h-full w-full overflow-hidden" style={{ ['--brand' as string]: tokens.primary, ['--accent' as string]: tokens.accent }}>
          <div ref={container} className="absolute inset-0" onDragOver={(e) => e.preventDefault()} onDrop={onDrop} data-testid="viewport" />
          {!webgl && <Result status="warning" title={S.webgl2Missing} />}
          {webgl && !viewer && <Spin className="absolute inset-0 m-auto h-fit" size="large" />}
          {viewer && (
            <ViewerContext.Provider value={viewer}>
              <Shell viewport={container} />
            </ViewerContext.Provider>
          )}
        </div>
      </AntApp>
    </ConfigProvider>
  );
}
