import { useEffect, useMemo, useState } from 'react';
import { Alert, App, Button, Checkbox, Input, Modal, Popover, Radio, Select, Switch, Table, Tag, Tooltip, Upload } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  UploadOutlined, DownloadOutlined, PlusOutlined, DeleteOutlined, UserOutlined, SettingOutlined, PushpinOutlined, SearchOutlined, InboxOutlined,
} from '@ant-design/icons';
import { filterTopics, type BcfVersion, type TopicFilters, type TopicRow } from '../../core';
import { useStore, useViewer } from '../viewer';
import { pickFiles } from '../pickFiles';
import { S } from '../strings';
import { AuthorDialog } from './AuthorDialog';
import { useConfirmDiscard } from './useConfirmDiscard';

type ColumnKey = keyof typeof S.bcf.columnsNames;
const ALL_COLUMNS = Object.keys(S.bcf.columnsNames) as ColumnKey[];
const FILTERABLE: (keyof TopicFilters)[] = ['type', 'status', 'priority', 'stage', 'labels', 'assignedTo'];
const COLS_KEY = 'bcf.columns';

const loadColumns = (): ColumnKey[] => {
  try {
    const v = JSON.parse(localStorage.getItem(COLS_KEY) ?? 'null');
    if (Array.isArray(v)) return v;
  } catch { /* fall through */ }
  return ['thumbnail', 'title', 'status', 'priority'];
};
const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString() : '');

export function BcfListPanel({ onOpenTopic }: { onOpenTopic(): void }) {
  const viewer = useViewer();
  const { bcf } = viewer;
  const { rows, query, filters, error, pinsVisible, pinColorBy, active, author } = useStore(bcf.store);
  const { message } = App.useApp();
  const confirmDiscard = useConfirmDiscard();
  const [selected, setSelected] = useState<string[]>([]);
  const [columns, setColumns] = useState<ColumnKey[]>(loadColumns);
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [authorOpen, setAuthorOpen] = useState<null | (() => void)>(null);
  const shown = useMemo(() => filterTopics(rows, query, filters), [rows, query, filters]);

  const saveColumns = (c: ColumnKey[]) => {
    setColumns(c);
    try { localStorage.setItem(COLS_KEY, JSON.stringify(c)); } catch { /* per-viewer convenience only */ }
  };

  const importFiles = async (files: File[]) => {
    let n = 0;
    for (const f of files) n += await bcf.importFile(f);
    if (n) message.success(`${n} topics imported`);
  };

  const withAuthor = (fn: () => void) => (author ? fn() : setAuthorOpen(() => fn));
  const newTopic = () => withAuthor(async () => { if (await confirmDiscard()) { await bcf.startCreate(); onOpenTopic(); } });
  const open = async (guid: string) => {
    if (active?.guid === guid) return onOpenTopic();
    if (!(await confirmDiscard())) return;
    await bcf.openTopic(guid);
    onOpenTopic();
  };

  const valuesOf = (k: keyof TopicFilters) => [...new Set(rows.flatMap((r) => (Array.isArray(r[k]) ? (r[k] as string[]) : r[k] ? [r[k] as string] : [])))];
  const col = (key: ColumnKey): ColumnsType<TopicRow>[number] => {
    const base = { key, dataIndex: key, title: S.bcf.columnsNames[key], ellipsis: true };
    const filter = FILTERABLE.includes(key as keyof TopicFilters)
      ? {
          filters: valuesOf(key as keyof TopicFilters).map((v) => ({ text: v, value: v })),
          filteredValue: filters[key as keyof TopicFilters] ?? null,
          onFilter: () => true, // filtering is done by filterTopics (also hides pins)
        }
      : {};
    switch (key) {
      case 'thumbnail':
        return { ...base, width: 76, ellipsis: false, render: (src?: string) => (src ? <img src={src} alt="" className="h-11 w-16 rounded object-cover" /> : <div className="h-11 w-16 rounded bg-neutral-100 dark:bg-neutral-800" />) };
      case 'labels':
        return { ...base, ...filter, render: (l: string[]) => l.map((x) => <Tag key={x}>{x}</Tag>) };
      case 'dueDate': case 'creationDate': case 'modifiedDate':
        return { ...base, width: 92, render: date, sorter: (a, b) => (a[key] ?? '').localeCompare(b[key] ?? '') };
      case 'title':
        return { ...base, sorter: (a, b) => a.title.localeCompare(b.title) };
      default:
        return { ...base, ...filter };
    }
  };

  const activeFilters = Object.entries(filters).filter(([, v]) => v?.length) as [keyof TopicFilters, string[]][];
  const iconBtn = (label: string, icon: React.ReactNode, onClick: () => void, disabled = false) => (
    <Tooltip title={label}><Button aria-label={label} icon={icon} onClick={onClick} disabled={disabled} shape="round" /></Tooltip>
  );

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="grid grid-cols-5 gap-1">
        {iconBtn(S.bcf.import, <UploadOutlined />, () => pickFiles('.bcf,.bcfzip', importFiles))}
        {iconBtn(S.bcf.export, <DownloadOutlined />, () => setExportOpen(true), !rows.length)}
        {iconBtn(S.bcf.newTopic, <PlusOutlined />, newTopic)}
        {iconBtn(S.bcf.delete, <DeleteOutlined />, () => setDeleteOpen(true), !rows.length)}
        {iconBtn(author ? `${S.bcf.author}: ${author}` : S.bcf.author, <UserOutlined />, () => setAuthorOpen(() => () => {}))}
      </div>
      <div className="flex items-center gap-1">
        <Popover trigger="click" placement="bottomLeft" content={
          <Checkbox.Group className="flex flex-col gap-1" value={columns} onChange={(v) => saveColumns(ALL_COLUMNS.filter((c) => (v as ColumnKey[]).includes(c)))}
            options={ALL_COLUMNS.map((c) => ({ label: S.bcf.columnsNames[c], value: c, disabled: c === 'title' }))} />
        }>
          <Tooltip title={S.bcf.columns}><Button size="small" type="text" aria-label={S.bcf.columns} icon={<SettingOutlined />} /></Tooltip>
        </Popover>
        <Popover trigger="click" placement="bottomLeft" content={
          <div className="flex w-56 flex-col gap-2">
            <label className="flex items-center justify-between gap-2">{S.bcf.pinsShow}<Switch size="small" checked={pinsVisible} onChange={bcf.setPinsVisible} /></label>
            <label className="flex items-center justify-between gap-2">{S.bcf.pinsColorBy}
              <Select size="small" value={pinColorBy} onChange={bcf.setPinColorBy} className="w-28"
                options={(['status', 'priority', 'type'] as const).map((v) => ({ value: v, label: S.bcf.columnsNames[v] }))} />
            </label>
          </div>
        }>
          <Tooltip title={S.bcf.pins}><Button size="small" type="text" aria-label={S.bcf.pins} icon={<PushpinOutlined />} /></Tooltip>
        </Popover>
        <Input size="small" allowClear prefix={<SearchOutlined />} placeholder={S.bcf.search} value={query} onChange={(e) => bcf.setQuery(e.target.value)} />
      </div>
      {error && <Alert type="error" showIcon closable title={S.bcf.importError} description={error} onClose={bcf.clearError} />}
      {!!activeFilters.length && (
        <div className="flex flex-wrap gap-1">
          {activeFilters.map(([k, v]) => (
            <Tag key={k} closable onClose={() => bcf.setFilters({ ...filters, [k]: [] })}>{S.bcf.columnsNames[k]}: {v.join(', ')}</Tag>
          ))}
        </div>
      )}
      {!rows.length ? (
        <Upload.Dragger accept=".bcf,.bcfzip" multiple showUploadList={false} beforeUpload={(f, list) => { if (f === list[0]) void importFiles(list); return false; }}>
          <p className="text-3xl"><InboxOutlined /></p>
          <p className="font-medium">{S.bcf.drop}</p>
          <p className="text-xs text-neutral-500">{S.bcf.dropHint}</p>
        </Upload.Dragger>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <Table<TopicRow>
            size="small"
            rowKey="guid"
            pagination={false}
            dataSource={shown}
            columns={columns.map(col)}
            rowSelection={{ selectedRowKeys: selected, onChange: (k) => setSelected(k as string[]), columnWidth: 32 }}
            onChange={(_p, f) => bcf.setFilters(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, (v as string[] | null) ?? []])) as TopicFilters)}
            rowClassName={(r) => `cursor-pointer ${r.guid === active?.guid ? 'ant-table-row-selected' : ''}`}
            onRow={(r) => ({ onClick: () => void open(r.guid) })}
            tableLayout="fixed"
          />
        </div>
      )}
      <div className="text-xs text-neutral-500">{S.bcf.topics(shown.length, rows.length)}</div>

      <ExportDialog open={exportOpen} total={rows.length} selected={selected} onClose={() => setExportOpen(false)} />
      <DeleteDialog open={deleteOpen} total={rows.length} selected={selected} onClose={(deleted) => { setDeleteOpen(false); if (deleted) setSelected([]); }} />
      <AuthorDialog open={!!authorOpen} onClose={(saved) => { const next = authorOpen; setAuthorOpen(null); if (saved) next?.(); }} />
    </div>
  );
}

function ExportDialog({ open, total, selected, onClose }: { open: boolean; total: number; selected: string[]; onClose(): void }) {
  const { bcf } = useViewer();
  const [scope, setScope] = useState<'all' | 'selected'>('all');
  const [version, setVersion] = useState<BcfVersion>('3');
  useEffect(() => { if (open) setScope(selected.length ? 'selected' : 'all'); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal open={open} title={S.bcf.exportTitle} okText={S.bcf.export} onCancel={onClose}
      onOk={async () => { await bcf.exportFile(scope === 'all' ? null : selected, version); onClose(); }}
>
      <div className="flex flex-col gap-3">
        <div>
          <div className="mb-1 font-medium">{S.bcf.exportScope}</div>
          <Radio.Group value={scope} onChange={(e) => setScope(e.target.value)} options={[
            { value: 'all', label: S.bcf.exportAll(total) },
            { value: 'selected', label: S.bcf.exportSelected(selected.length), disabled: !selected.length },
          ]} />
        </div>
        <div>
          <div className="mb-1 font-medium">{S.bcf.exportVersion}</div>
          <Radio.Group value={version} onChange={(e) => setVersion(e.target.value)} optionType="button" options={[{ value: '3', label: 'BCF 3.0' }, { value: '2.1', label: 'BCF 2.1' }]} />
        </div>
      </div>
    </Modal>
  );
}

function DeleteDialog({ open, total, selected, onClose }: { open: boolean; total: number; selected: string[]; onClose(deleted: boolean): void }) {
  const { bcf } = useViewer();
  return (
    <Modal open={open} title={S.bcf.deleteTitle} onCancel={() => onClose(false)} footer={[
      <Button key="c" onClick={() => onClose(false)}>{S.bcf.topic.cancel}</Button>,
      <Button key="s" danger disabled={!selected.length} onClick={() => { bcf.deleteTopics(selected); onClose(true); }}>{S.bcf.deleteSelected(selected.length)}</Button>,
      <Button key="a" danger type="primary" onClick={() => { bcf.deleteTopics(null); onClose(true); }}>{S.bcf.deleteAll(total)}</Button>,
    ]}>
      {S.bcf.deleteConfirm}
    </Modal>
  );
}
