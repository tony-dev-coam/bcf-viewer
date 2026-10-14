import { useMemo, useState } from 'react';
import { Button, Input, Progress, Tooltip, Empty, Typography } from 'antd';
import { UploadOutlined, DeleteOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useStore, useViewer } from '../viewer';
import { S } from '../strings';
import { pickFiles } from '../pickFiles';

export function FilesPanel() {
  const { models } = useViewer();
  const list = useStore(models.store);
  const [q, setQ] = useState('');
  const shown = useMemo(() => list.filter((m) => m.id.toLowerCase().includes(q.toLowerCase())), [list, q]);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Button icon={<UploadOutlined />} onClick={() => pickFiles('.ifc,.frag', (f) => models.load(f))}>{S.files.load}</Button>
        <Button icon={<DeleteOutlined />} disabled={!list.length} onClick={() => models.unloadAll()}>{S.files.unloadAll}</Button>
      </div>
      <Input allowClear prefix={<SearchOutlined />} placeholder={S.files.search} value={q} onChange={(e) => setQ(e.target.value)} />
      {!shown.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={S.files.empty} />}
      {shown.map((m) => (
        <div key={m.id} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-neutral-50 dark:hover:bg-neutral-800">
          <div className="min-w-0 flex-1">
            <Typography.Text ellipsis title={m.fileName}>{m.id}</Typography.Text>
            {m.status === 'loading' && <Progress size="small" percent={Math.round(m.progress * 100)} />}
            {m.status === 'error' && <Typography.Text type="danger" className="block text-xs">{m.error}</Typography.Text>}
          </div>
          <Tooltip title={S.files.downloadFrag}>
            <Button size="small" type="text" aria-label={S.files.downloadFrag} icon={<DownloadOutlined />} disabled={m.status !== 'ready'} onClick={() => models.downloadFrag(m.id)} />
          </Tooltip>
          <Tooltip title={S.files.unload}>
            <Button size="small" type="text" aria-label={S.files.unload} icon={<DeleteOutlined />} disabled={m.status === 'loading'} onClick={() => models.unload(m.id)} />
          </Tooltip>
        </div>
      ))}
    </div>
  );
}
