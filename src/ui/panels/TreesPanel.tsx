import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, ColorPicker, Empty, Input, Spin, Tooltip, Tree, Typography } from 'antd';
import {
  SearchOutlined, PlusSquareOutlined, MinusSquareOutlined, AimOutlined, EyeOutlined, EyeInvisibleOutlined,
  BorderOutlined, HomeOutlined, ColumnWidthOutlined, PlusOutlined,
} from '@ant-design/icons';
import { collectItems, type TreeNode } from '../../core';
import { useStore, useViewer } from '../viewer';
import { S } from '../strings';

type TabKey = keyof typeof S.trees.tabs;
type IdMap = Record<string, Set<number>>;

const itemKey = (m: string, id: number) => `${m}:${id}`;
const flatKeys = (map: IdMap) => new Set(Object.entries(map).flatMap(([m, ids]) => [...ids].map((id) => itemKey(m, id))));
const merge = (a: IdMap, b: IdMap): IdMap => {
  const out: IdMap = {};
  for (const map of [a, b]) for (const [m, ids] of Object.entries(map)) for (const id of ids) (out[m] ??= new Set()).add(id);
  return out;
};

/** Keeps nodes whose title/class matches, plus their ancestors. */
function filterTree(nodes: TreeNode[], q: string): TreeNode[] {
  if (!q) return nodes;
  const out: TreeNode[] = [];
  for (const n of nodes) {
    const kids = n.children ? filterTree(n.children, q) : [];
    if (`${n.title} ${n.label ?? ''} ${n.ifcClass ?? ''}`.toLowerCase().includes(q) || kids.length) out.push({ ...n, children: kids.length ? kids : n.children && undefined });
  }
  return out;
}

function walk(nodes: TreeNode[], fn: (n: TreeNode, parents: TreeNode[]) => void, parents: TreeNode[] = []) {
  for (const n of nodes) {
    fn(n, parents);
    if (n.children) walk(n.children, fn, [...parents, n]);
  }
}

export function TreesPanel() {
  const viewer = useViewer();
  const trees = useStore(viewer.trees.store);
  const { items: selected, count } = useStore(viewer.selection.store);
  const { version } = useStore(viewer.visibility.store);
  const { custom } = useStore(viewer.color.store);
  const [tab, setTab] = useState<TabKey>('relations');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<React.Key[]>([]);
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const anchor = useRef<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(400);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setHeight(Math.max(120, e.contentRect.height)));
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  // Visible element set, refreshed whenever visibility changes (for the eye icons).
  useEffect(() => {
    let stale = false;
    viewer.visibility.visibleMap().then((map) => {
      if (!stale) setVisible(new Set(Object.entries(map).flatMap(([m, ids]) => ids.map((id) => itemKey(m, id)))));
    });
    return () => { stale = true; };
  }, [version, trees, viewer]);

  const source = trees[tab];
  const data = useMemo(() => filterTree(source, query.toLowerCase()), [source, query]);
  const nodeByKey = useMemo(() => {
    const m = new Map<string, TreeNode>();
    walk(source, (n) => m.set(n.key, n));
    return m;
  }, [source]);

  // Leaves/entities whose own items are all selected are shown as selected rows.
  const selectedKeys = useMemo(() => {
    const sel = flatKeys(selected);
    const keys: string[] = [];
    if (!sel.size) return keys;
    walk(data, (n) => {
      const own = n.own && flatKeys(n.own);
      if (own?.size && [...own].every((k) => sel.has(k))) keys.push(n.key);
    });
    return keys;
  }, [selected, data]);

  // A node is hidden when none of its elements is visible (spatial entities without geometry never are).
  const isHidden = (n: TreeNode) => {
    for (const [m, ids] of Object.entries(collectItems(n))) for (const id of ids) if (visible.has(itemKey(m, id))) return false;
    return true;
  };

  /** MT-05: null = original color, a hex = one custom color, 'mixed' = several. */
  const nodeColor = (n: TreeNode): string | null | 'mixed' => {
    const hexes = Object.keys(custom);
    if (!hexes.length) return null;
    let found: string | null | undefined;
    for (const [m, ids] of Object.entries(collectItems(n))) {
      for (const id of ids) {
        const c = hexes.find((h) => custom[h][m]?.has(id)) ?? null;
        if (found === undefined) found = c;
        else if (found !== c) return 'mixed';
      }
    }
    return found ?? null;
  };

  const visibleOrder = () => {
    const order: string[] = [];
    const open = new Set(expanded);
    const rec = (ns: TreeNode[]) => ns.forEach((n) => { order.push(n.key); if (n.children && open.has(n.key)) rec(n.children); });
    rec(data);
    return order;
  };

  const onRowClick = (e: React.MouseEvent, node: TreeNode) => {
    let items = collectItems(node);
    if (e.shiftKey && anchor.current) {
      // MT-06: SHIFT selects the visible range between the anchor and this row.
      const order = visibleOrder();
      const [a, b] = [order.indexOf(anchor.current), order.indexOf(node.key)].sort((x, y) => x - y);
      if (a >= 0) items = order.slice(a, b + 1).map((k) => collectItems(nodeByKey.get(k)!)).reduce(merge, {});
    } else anchor.current = node.key;
    viewer.selection.set(e.ctrlKey || e.metaKey ? merge(viewer.selection.store.getSnapshot().items, items) : items);
  };

  const toggleVisible = (node: TreeNode) => {
    // On a selected row the eye applies to the whole selection.
    const items = selectedKeys.includes(node.key) ? selected : collectItems(node);
    return isHidden(node) ? viewer.visibility.show(items) : viewer.visibility.hide(items);
  };

  const expandToSelection = () => {
    const keys = new Set<string>();
    walk(data, (n, parents) => selectedKeys.includes(n.key) && parents.forEach((p) => keys.add(p.key)));
    setExpanded([...keys]);
  };

  const iconBtn = (label: string, icon: React.ReactNode, onClick: () => void, opts: { disabled?: boolean; active?: boolean } = {}) => (
    <Tooltip title={label}>
      <Button size="small" type={opts.active ? 'primary' : 'text'} ghost={opts.active} aria-label={label} aria-pressed={opts.active} icon={icon} disabled={opts.disabled} onClick={onClick} />
    </Tooltip>
  );

  return (
    <div className="flex h-full flex-col gap-2">
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
        {(Object.keys(S.trees.tabs) as TabKey[]).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setExpanded(k === 'storeys' ? trees.storeys.map((n) => n.key) : []); }}
            className={`cursor-pointer rounded-lg border-0 py-1 text-xs text-neutral-700 dark:text-neutral-200 ${tab === k ? 'bg-white font-semibold shadow-sm dark:bg-neutral-700' : 'bg-transparent'}`}>
            {S.trees.tabs[k]}
          </button>
        ))}
      </div>
      <Input allowClear size="small" prefix={<SearchOutlined />} placeholder={S.trees.search} value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5">
          {iconBtn(S.trees.expandAll, <PlusSquareOutlined />, () => { const ks: string[] = []; walk(data, (n) => n.children && ks.push(n.key)); setExpanded(ks); })}
          {iconBtn(S.trees.collapseAll, <MinusSquareOutlined />, () => setExpanded([]))}
          {iconBtn(S.trees.expandToSelection, <AimOutlined />, expandToSelection, { disabled: !count })}
        </div>
        <div className="flex gap-0.5">
          {iconBtn(S.trees.spaces, <HomeOutlined />, () => viewer.trees.setShowSpaces(!trees.showSpaces), { active: trees.showSpaces })}
          {iconBtn(S.trees.openings, <BorderOutlined />, () => viewer.trees.setShowOpenings(!trees.showOpenings), { active: trees.showOpenings })}
          {iconBtn(S.trees.showSelected, <PlusOutlined />, () => viewer.visibility.show(selected), { disabled: !count })}
          {iconBtn(S.trees.hideSelected, <EyeInvisibleOutlined />, () => viewer.visibility.hide(selected), { disabled: !count })}
          {iconBtn(S.trees.isolate, <ColumnWidthOutlined />, () => (viewer.visibility.store.getSnapshot().isolated ? viewer.visibility.showAll() : viewer.visibility.isolate(selected)), { disabled: !count && !viewer.visibility.store.getSnapshot().isolated })}
          {iconBtn(S.trees.showAll, <EyeOutlined />, () => viewer.visibility.showAll())}
        </div>
      </div>
      <div ref={box} className="min-h-0 flex-1">
        {trees.loading && <Spin className="mt-6 w-full" tip={S.trees.loading}><div /></Spin>}
        {!trees.loading && !data.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={S.trees.empty} />}
        {!trees.loading && !!data.length && (
          <Tree<TreeNode>
            virtual
            height={height}
            blockNode
            treeData={data}
            fieldNames={{ key: 'key', title: 'title', children: 'children' }}
            expandedKeys={query ? undefined : expanded}
            defaultExpandAll={!!query}
            onExpand={(keys) => setExpanded(keys)}
            selectedKeys={selectedKeys}
            onSelect={() => {}}
            titleRender={(node) => {
              const off = isHidden(node);
              return (
                <div className={`group flex items-center gap-1 ${off ? 'opacity-50' : ''}`} onClick={(e) => onRowClick(e, node)}>
                  {/* Labelled rows (storey levels / model storeys) are headers: bold title, label right-aligned. */}
                  {/* Ellipsis + tooltip only when the name is actually cut off. */}
                  <Typography.Text className={`min-w-0 flex-1 ${node.isGroup || node.label || node.key.split(':').length < 3 ? 'font-semibold' : ''}`} ellipsis={{ tooltip: node.ifcClass ? `${node.title} (${node.ifcClass})` : node.title }}>
                    {node.title}
                  </Typography.Text>
                  {node.label && <span className="shrink-0 truncate">{node.label}</span>}
                  <Swatch
                    color={nodeColor(node)}
                    label={node.label ? `${node.title} ${node.label}` : node.title}
                    onPick={(hex) => {
                      const items = selectedKeys.includes(node.key) ? selected : collectItems(node);
                      return hex ? viewer.color.paint(items, hex) : viewer.color.erase(items);
                    }}
                  />
                  <button
                    aria-label={`${S.trees.toggleVisibility} ${node.label ? `${node.title} ${node.label}` : node.title}`}
                    className="cursor-pointer border-0 bg-transparent p-0.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                    onClick={(e) => { e.stopPropagation(); toggleVisible(node); }}
                  >
                    {off ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  </button>
                </div>
              );
            }}
          />
        )}
      </div>
    </div>
  );
}

interface SwatchProps {
  color: string | null | 'mixed';
  label: string;
  onPick(hex: string | null): void;
}

function Swatch({ color, label, onPick }: SwatchProps) {
  const style =
    color === 'mixed'
      ? { background: 'conic-gradient(#e74c3c, #f1c40f, #2ecc71, #3498db, #9b59b6, #e74c3c)' }
      : color
        ? { background: color, boxShadow: `0 0 0 2px white, 0 0 0 3px ${color}` }
        : { background: 'linear-gradient(135deg, #c9c9c9, #8f8f8f)' };
  return (
    <span onClick={(e) => e.stopPropagation()}>
      <ColorPicker
        size="small"
        disabledAlpha
        allowClear
        value={color && color !== 'mixed' ? color : undefined}
        onChangeComplete={(c) => onPick(c.toHexString())}
        onClear={() => onPick(null)}
      >
        <button aria-label={`${S.trees.color} ${label}`} className="size-3 cursor-pointer rounded-full border-0 p-0" style={style} />
      </ColorPicker>
    </span>
  );
}
