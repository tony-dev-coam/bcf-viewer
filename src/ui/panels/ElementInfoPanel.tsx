import { useEffect, useMemo, useState } from 'react';
import { Collapse, Empty, Input, Spin, Button, Tooltip, Typography } from 'antd';
import { SearchOutlined, NodeExpandOutlined, NodeCollapseOutlined } from '@ant-design/icons';
import type { ElementInfo, Group } from '../../core';
import { useStore, useViewer } from '../viewer';
import { S } from '../strings';

function GroupList({ groups, query }: { groups: Group[]; query: string }) {
  const q = query.toLowerCase();
  const shown = useMemo(
    () => groups
      .map((g) => ({ ...g, rows: q ? g.rows.filter(([k, v]) => `${k} ${v} ${g.name}`.toLowerCase().includes(q)) : g.rows }))
      .filter((g) => g.rows.length),
    [groups, q],
  );
  const [open, setOpen] = useState<string[]>(() => groups.slice(0, 1).map((g) => g.name));
  if (!shown.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  return (
    <>
      <div className="mb-1 flex justify-end gap-1">
        <Tooltip title={S.info.expandAll}><Button size="small" type="text" aria-label={S.info.expandAll} icon={<NodeExpandOutlined />} onClick={() => setOpen(shown.map((g) => g.name))} /></Tooltip>
        <Tooltip title={S.info.collapseAll}><Button size="small" type="text" aria-label={S.info.collapseAll} icon={<NodeCollapseOutlined />} onClick={() => setOpen([])} /></Tooltip>
      </div>
      <Collapse
        size="small"
        ghost
        activeKey={q ? shown.map((g) => g.name) : open}
        onChange={(k) => setOpen(k as string[])}
        items={shown.map((g) => ({
          key: g.name,
          label: <span className="font-semibold">{g.name}</span>,
          children: (
            <table className="w-full table-fixed border-collapse text-xs">
              <tbody>
                {g.rows.map(([k, v], i) => (
                  <tr key={i} className="border-0 border-b border-solid border-neutral-100 dark:border-neutral-800">
                    <td className="w-2/5 py-1 pr-2 align-top text-neutral-500"><Typography.Text ellipsis={{ tooltip: k }} className="text-xs">{k}</Typography.Text></td>
                    <td className="py-1 align-top"><Typography.Text copyable={!!v && { text: v }} ellipsis={{ tooltip: v }} className="text-xs">{v}</Typography.Text></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ),
        }))}
      />
    </>
  );
}

export function ElementInfoPanel() {
  const viewer = useViewer();
  const { items, count } = useStore(viewer.selection.store);
  const [info, setInfo] = useState<ElementInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [tabKey, setTabKey] = useState<keyof typeof S.info.tabs>('identity');

  useEffect(() => {
    if (count !== 1) return setInfo(null);
    const [modelId, ids] = Object.entries(items)[0];
    let stale = false;
    setLoading(true);
    viewer.elementInfo(modelId, [...ids][0]).then((i) => !stale && setInfo(i)).finally(() => !stale && setLoading(false));
    return () => { stale = true; };
  }, [items, count, viewer]);

  if (count > 1) return <Empty description={S.info.multiple} />;
  if (count === 0) return <Empty description={S.info.empty} />;
  if (loading || !info) return <Spin className="mt-8 w-full" tip={S.info.loading}><div /></Spin>;

  const identity: Group[] = [
    { name: S.info.attributes, rows: info.attributes },
    { name: S.info.general, rows: [['Class', info.ifcClass], ['Model', info.model]] },
  ];
  const tabs: [keyof typeof S.info.tabs, Group[]][] = [
    ['identity', identity], ['properties', info.psets], ['quantities', info.qtos], ['relations', info.relations], ['materials', info.materials],
  ];
  const activeGroups = tabs.find(([k]) => k === tabKey)?.[1] ?? identity;

  return (
    <div className="flex flex-col gap-2">
      <Typography.Title level={5} className="!m-0 px-1" ellipsis>{info.ifcClass}</Typography.Title>
      {/* Wrapping pill tabs (the reference shows 5 tabs on two rows in a narrow panel). */}
      <div role="tablist" className="flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
        {tabs.map(([key, groups]) => (
          <button
            key={key}
            role="tab"
            id={`ei-tab-${key}`}
            aria-selected={tabKey === key}
            aria-controls="ei-tabpanel"
            disabled={!groups.length}
            onClick={() => setTabKey(key)}
            className={`cursor-pointer rounded-lg border-0 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
              tabKey === key ? 'bg-white font-semibold shadow-sm dark:bg-neutral-700' : 'bg-transparent'
            }`}
          >
            {S.info.tabs[key]}
          </button>
        ))}
      </div>
      <Input allowClear size="small" prefix={<SearchOutlined />} placeholder={S.info.search} value={query} onChange={(e) => setQuery(e.target.value)} />
      <div role="tabpanel" id="ei-tabpanel" aria-labelledby={`ei-tab-${tabKey}`}>
        <GroupList key={`${tabKey}-${info.attributes[0][1]}`} groups={activeGroups} query={query} />
      </div>
    </div>
  );
}
