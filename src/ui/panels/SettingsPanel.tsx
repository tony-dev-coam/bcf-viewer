import { Switch } from 'antd';
import { MoonOutlined, AppstoreOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import { useStore, useViewer } from '../viewer';
import { S } from '../strings';

function Card({ icon, title, hint, children }: { icon: ReactNode; title: string; hint: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-solid border-neutral-200 p-3 dark:border-neutral-700">
      <div className="flex items-center gap-2 font-semibold">{icon}{title}</div>
      <div className="mb-2 text-xs text-neutral-500">{hint}</div>
      {children}
    </div>
  );
}

function Row({ label, checked, onChange }: { label: string; checked: boolean; onChange(v: boolean): void }) {
  return (
    <label className="flex items-center justify-between border-0 border-t border-solid border-neutral-100 py-2 dark:border-neutral-800">
      <span>{label}</span>
      <Switch size="small" checked={checked} onChange={onChange} aria-label={label} />
    </label>
  );
}

export function SettingsPanel() {
  const { settings } = useViewer();
  const s = useStore(settings.store);
  return (
    <div className="flex flex-col gap-2">
      <Card icon={<MoonOutlined />} title={S.settings.theme} hint={S.settings.themeHint}>
        <Row label={S.settings.theme} checked={s.theme === 'dark'} onChange={(v) => settings.update({ theme: v ? 'dark' : 'light' })} />
      </Card>
      <Card icon={<AppstoreOutlined />} title={S.settings.appearance} hint={S.settings.appearanceHint}>
        <Row label={S.settings.outlines} checked={s.outlines} onChange={(outlines) => settings.update({ outlines })} />
        <Row label={S.settings.depthShadows} checked={s.depthShadows} onChange={(depthShadows) => settings.update({ depthShadows })} />
        <Row label={S.settings.antialiasing} checked={s.antialiasing} onChange={(antialiasing) => settings.update({ antialiasing })} />
        <Row label={S.settings.fixMissingFaces} checked={s.fixMissingFaces} onChange={(fixMissingFaces) => settings.update({ fixMissingFaces })} />
      </Card>
    </div>
  );
}
