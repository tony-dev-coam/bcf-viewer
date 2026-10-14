import { useState, type ReactNode } from 'react';
import { Popover, Tooltip } from 'antd';

export interface ToolItem {
  key: string;
  label: string;
  icon: ReactNode;
  onClick(): void;
  active?: boolean;
  disabled?: boolean;
  /** Toggles/commands render as plain buttons; modes render with a ring when active. */
  kind?: 'mode' | 'command';
}

export interface ToolGroupDef {
  key: string;
  label: string;
  tone: 'interaction' | 'view' | 'neutral';
  items: ToolItem[]; // last item = default shown on the group button
}

const ring = { interaction: 'border-[var(--accent)]', view: 'border-[var(--brand)]', neutral: 'border-transparent' };

function ItemButton({ item, tone, size = 40 }: { item: ToolItem; tone: ToolGroupDef['tone']; size?: number }) {
  return (
    <Tooltip title={item.label} placement="right" mouseEnterDelay={0.2}>
      <button
        aria-label={item.label}
        aria-pressed={item.kind !== 'command' ? !!item.active : undefined}
        disabled={item.disabled}
        onClick={item.onClick}
        style={{ width: size, height: size }}
        className={`grid cursor-pointer place-items-center rounded-full border-2 text-lg text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-200 ${
          item.kind === 'command' ? 'border-transparent' : item.active ? `${ring[tone]} border-solid` : `${ring[tone]} border-dashed`
        } ${item.active ? 'bg-neutral-100 dark:bg-neutral-800' : 'bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
      >
        {item.icon}
      </button>
    </Tooltip>
  );
}

function ToolGroup({ group }: { group: ToolGroupDef }) {
  // The group button shows the active item, else the last one used, else the default (last).
  const [last, setLast] = useState(group.items.length - 1);
  const shown = group.items.find((i) => i.active) ?? group.items[last] ?? group.items[0];
  const items = group.items.map((i, idx) => ({ ...i, onClick: () => { setLast(idx); i.onClick(); } }));
  const menu = (
    <div className="flex flex-col-reverse gap-2" role="menu" aria-label={group.label}>
      {items.map((i) => <ItemButton key={i.key} item={i} tone={group.tone} />)}
    </div>
  );
  return (
    <Popover content={menu} placement="top" trigger="hover" arrow={false} mouseLeaveDelay={0.15} styles={{ container: { padding: 6, borderRadius: 999 } }}>
      <div className="relative">
        <span className="pointer-events-none absolute -top-1.5 left-1/2 -translate-x-1/2 text-[9px] leading-none text-neutral-400">^</span>
        <ItemButton item={{ ...shown, onClick: items[group.items.indexOf(shown)].onClick, label: group.label }} tone={group.tone} />
      </div>
    </Popover>
  );
}

export function Toolbar({ groups }: { groups: ToolGroupDef[][] }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm dark:bg-neutral-900" role="toolbar" aria-label="Tools">
      {groups.map((section, i) => (
        <div key={i} className={`flex gap-2 ${i ? 'border-0 border-l border-solid border-neutral-200 pl-2 dark:border-neutral-700' : ''}`}>
          {section.map((g) => <ToolGroup key={g.key} group={g} />)}
        </div>
      ))}
    </div>
  );
}
