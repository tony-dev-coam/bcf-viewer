import { useEffect, useRef, useState, type RefObject } from 'react';
import { Tooltip } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { lastUsed, shownItem, type ToolGroupDef, type ToolItem } from './layout/Toolbar';
import { useStore } from './viewer';
import { S } from './strings';

// Reference (viewer.crais.io) right-click menu: 4 spokes around the cursor, each a toolbar group showing its
// current tool; hovering a spoke fans its options out in an arc. Item keys, in clockwise fan order.
const SPOKES: { group: string; angle: number; keys: string[] }[] = [
  { group: 'selection', angle: -90, keys: ['marquee', 'select'] },
  { group: 'visibility', angle: 0, keys: ['isolate', 'hide-sel', 'zoom-sel', 'zoom-all', 'show-all', 'reset'] },
  { group: 'measurement', angle: 90, keys: ['volume', 'area-face', 'area-rect', 'area-free', 'length-edge', 'length-free'] },
  { group: 'clipping', angle: 180, keys: ['clip-box', 'clip-plane'] },
];
const SPOKE_R = 80;
const HIT_R = 216;
const FAN_SPREAD = 107; // degrees covered by a fan, centred on its spoke
const fanRadius = (n: number) => 35 + 13 * n; // 2 items → 61 px, 6 → 113 px (measured on the reference)
const CLICK_SLOP = 5; // px; a right-drag (camera pan) must not open the menu

const polar = (r: number, deg: number) => ({ x: r * Math.cos((deg * Math.PI) / 180), y: r * Math.sin((deg * Math.PI) / 180) });

function RadialButton({ item, x, y, size, onPick, onHover, current }: { item: ToolItem; x: number; y: number; size: number; onPick(): void; onHover?(): void; current?: boolean }) {
  const border = item.kind === 'command'
    ? 'border-solid border-neutral-300 dark:border-neutral-600'
    : `border-[var(--accent)] ${item.active ? 'border-solid' : 'border-dashed'}`;
  return (
    <Tooltip title={item.label} mouseEnterDelay={0.1}>
      <button
        aria-label={item.label}
        aria-pressed={item.kind !== 'command' ? !!item.active : undefined}
        onPointerEnter={onHover}
        onClick={onPick}
        style={{ left: x, top: y, width: size, height: size }}
        className={`absolute grid -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full border text-lg text-neutral-700 shadow-lg transition-transform hover:scale-105 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800 ${current ? 'bg-neutral-100 dark:bg-neutral-800' : 'bg-white dark:bg-neutral-900'} ${border}`}
      >
        {item.icon}
      </button>
    </Tooltip>
  );
}

export function RadialMenu({ viewport, groups }: { viewport: RefObject<HTMLElement | null>; groups: ToolGroupDef[][] }) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const [fan, setFan] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const last = useStore(lastUsed);
  const byKey = new Map(groups.flat().map((g) => [g.key, g]));
  const spokes = SPOKES.flatMap((s) => {
    const g = byKey.get(s.group);
    const items = s.keys.map((k) => g?.items.find((i) => i.key === k)).filter((i): i is ToolItem => !!i);
    // Like its toolbar button, a spoke shows the active item, else the last used, else the default (last key).
    return g && items.length ? [{ ...s, items, shown: shownItem({ ...g, items }, last) }] : [];
  });

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => { if (e.button === 2) down = { x: e.clientX, y: e.clientY }; };
    // Native contextmenu fires on mousedown on macOS (before any drag), so open on right-button release instead.
    const onMenu = (e: MouseEvent) => e.preventDefault();
    const onUp = (e: PointerEvent) => {
      if (e.button !== 2 || !down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_SLOP;
      down = null;
      if (moved) return;
      const r = el.getBoundingClientRect();
      setAt({ x: e.clientX - r.left, y: e.clientY - r.top });
      setFan(null); // opens collapsed; hovering a spoke fans it out
    };
    el.addEventListener('pointerdown', onDown, true);
    el.addEventListener('pointerup', onUp, true);
    el.addEventListener('contextmenu', onMenu);
    return () => {
      el.removeEventListener('pointerdown', onDown, true);
      el.removeEventListener('pointerup', onUp, true);
      el.removeEventListener('contextmenu', onMenu);
    };
  });

  useEffect(() => {
    if (!at) return;
    const close = () => setAt(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) close(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown, true);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown, true); };
  }, [at]);

  if (!at) return null;
  // The reference never greys items out; an item that cannot apply right now (e.g. hide with nothing selected) is a no-op.
  const pick = (group: string, item: ToolItem) => () => {
    setAt(null);
    if (item.disabled) return;
    lastUsed.update({ [group]: item.key });
    item.onClick();
  };
  return (
    // 432 px hit circle centred on the cursor (as on the reference); a click on its blank area closes the menu.
    <div
      ref={root}
      role="menu"
      aria-label={S.contextMenu}
      className="absolute z-50 -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{ left: at.x, top: at.y, width: 2 * HIT_R, height: 2 * HIT_R }}
      onPointerDown={(e) => e.target === e.currentTarget && setAt(null)}
    >
      <div className="absolute" style={{ left: HIT_R, top: HIT_R }}>
        {spokes.map((s) => {
          const c = polar(SPOKE_R, s.angle);
          const r = fanRadius(s.items.length);
          return (
            <div key={s.group}>
              <RadialButton item={s.shown} x={c.x} y={c.y} size={44} onPick={pick(s.group, s.shown)} onHover={() => setFan(s.group)} />
              {fan === s.group && s.items.map((item, i) => {
                const p = polar(r, s.angle - FAN_SPREAD / 2 + (s.items.length > 1 ? (i * FAN_SPREAD) / (s.items.length - 1) : FAN_SPREAD / 2));
                return <RadialButton key={item.key} item={item} x={c.x + p.x} y={c.y + p.y} size={36} onPick={pick(s.group, item)} current={item.kind === 'command' && item.key === s.shown.key} />;
              })}
            </div>
          );
        })}
        <RadialButton item={{ key: 'close', label: S.close, icon: <CloseOutlined />, kind: 'command', onClick: () => {} }} x={0} y={0} size={36} onPick={() => setAt(null)} />
      </div>
    </div>
  );
}
