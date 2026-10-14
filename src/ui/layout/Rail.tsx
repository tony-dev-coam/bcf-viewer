import { Tooltip } from 'antd';
import {
  UploadOutlined, ApartmentOutlined, ProfileOutlined, CommentOutlined,
  MessageOutlined, QuestionOutlined, SettingOutlined, LoadingOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import { S } from '../strings';

export type PanelId = 'files' | 'trees' | 'info' | 'bcf' | 'topic' | 'help' | 'settings';

const top: [PanelId, ReactNode][] = [
  ['files', <UploadOutlined />],
  ['trees', <ApartmentOutlined />],
  ['info', <ProfileOutlined />],
  ['bcf', <CommentOutlined />],
  ['topic', <MessageOutlined />],
];
const bottom: [PanelId, ReactNode][] = [
  ['help', <QuestionOutlined />],
  ['settings', <SettingOutlined />],
];

function RailButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick(): void; children: ReactNode }) {
  return (
    <Tooltip title={label} placement="right">
      <button
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className={`grid size-9 cursor-pointer place-items-center rounded-full border-0 text-lg text-neutral-700 dark:text-neutral-200 ${
          active ? 'bg-neutral-200 dark:bg-neutral-700' : 'bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800'
        }`}
      >
        {children}
      </button>
    </Tooltip>
  );
}

export function Rail({ active, onSelect, busy }: { active: PanelId | null; onSelect(p: PanelId | null): void; busy?: boolean }) {
  const btn = ([id, icon]: [PanelId, ReactNode]) => (
    <RailButton key={id} label={S.panels[id]} active={active === id} onClick={() => onSelect(active === id ? null : id)}>
      {icon}
    </RailButton>
  );
  return (
    <nav className="flex h-full w-12 flex-col items-center gap-1 rounded-2xl bg-white py-2 shadow-sm dark:bg-neutral-900">
      <RailButton label={S.panels.toggle} onClick={() => onSelect(active ? null : 'trees')}>
        {busy ? <LoadingOutlined /> : <span className="font-bold text-[var(--brand)]">◔</span>}
      </RailButton>
      <div className="h-2" />
      {top.map(btn)}
      <div className="flex-1" />
      {bottom.map(btn)}
    </nav>
  );
}
