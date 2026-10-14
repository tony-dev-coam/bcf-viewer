import { useState } from 'react';
import { App, Button, Checkbox, DatePicker, Descriptions, Empty, Input, Select, Tag, Tooltip, Dropdown } from 'antd';
import {
  CloseOutlined, DeleteOutlined, EditOutlined, PlusOutlined, SendOutlined, CameraOutlined, PushpinOutlined,
  MoreOutlined, ExpandOutlined, DownloadOutlined, ReloadOutlined, PictureOutlined, AimOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ViewpointRow } from '../../core';
import { useStore, useViewer } from '../viewer';
import { pickFiles } from '../pickFiles';
import { S } from '../strings';
import { SnapshotViewer } from './SnapshotViewer';
import { useConfirmDiscard } from './useConfirmDiscard';

const T = S.bcf.topic;
const fmt = (iso?: string) => (iso ? dayjs(iso).format('MM/DD/YYYY hh:mm A') : '');

export function BcfTopicPanel({ onClose }: { onClose(): void }) {
  const viewer = useViewer();
  const { bcf } = viewer;
  const { active, session, options } = useStore(bcf.store);
  const { modal, message } = App.useApp();
  const confirmDiscard = useConfirmDiscard();
  const [comment, setComment] = useState('');
  const [attachView, setAttachView] = useState(true);
  const [sending, setSending] = useState(false);
  const [enlarged, setEnlarged] = useState<{ vp: string; src: string } | null>(null);
  const editing = !!session;
  const draft = session?.draft;

  if (!active && !session) {
    return (
      <Card onClose={onClose}>
        <Empty description={<><div>{T.empty}</div><div className="text-xs text-neutral-500">{T.emptyHint}</div></>} />
      </Card>
    );
  }

  const send = async () => {
    if (!comment.trim() || sending) return;
    setSending(true);
    try {
      await bcf.addComment(comment.trim(), attachView);
      setComment('');
    } finally {
      setSending(false);
    }
  };
  const close = async () => { if (await confirmDiscard()) { bcf.closeTopic(); onClose(); } };
  const remove = () => modal.confirm({
    title: T.deleteTitle, content: T.deleteMessage, okText: T.delete, okButtonProps: { danger: true },
    onOk: () => { bcf.deleteTopics([active!.guid]); onClose(); },
  });
  const save = () => {
    const err = bcf.saveSession();
    if (err) message.error(err);
  };
  const replaceFromFile = (vp: string) => pickFiles('image/png,image/jpeg', async ([f]) => {
    if (!/^image\/(png|jpeg)$/.test(f.type)) return message.error(T.invalidImage);
    bcf.replaceSnapshot(vp, new Uint8Array(await f.arrayBuffer()));
  }, false);

  const viewpointCard = (vp: ViewpointRow) => {
    const menu = [
      { key: 'enlarge', icon: <ExpandOutlined />, label: T.enlarge, disabled: !vp.snapshot, onClick: () => vp.snapshot && setEnlarged({ vp: vp.guid, src: vp.snapshot }) },
      { key: 'download', icon: <DownloadOutlined />, label: T.download, disabled: !vp.snapshot, onClick: () => vp.snapshot && Object.assign(document.createElement('a'), { href: vp.snapshot, download: `snapshot-${vp.number}.png` }).click() },
      ...(editing ? [
        { key: 'refresh', icon: <ReloadOutlined />, label: T.refresh, onClick: () => bcf.refreshViewpoint(vp.guid) },
        { key: 'replace', icon: <PictureOutlined />, label: T.replace, onClick: () => replaceFromFile(vp.guid) },
        vp.pin
          ? { key: 'unpin', icon: <PushpinOutlined />, label: T.removePin, onClick: () => bcf.removePin(vp.guid) }
          : { key: 'pin', icon: <PushpinOutlined />, label: T.placePin, onClick: () => bcf.placePin(vp.guid) },
      ] : []),
    ];
    return (
      <div className="group relative mt-2 overflow-hidden rounded-lg border border-solid border-neutral-200 dark:border-neutral-700">
        <button aria-label={`${T.restore} ${vp.number}`} className="block w-full cursor-pointer border-0 bg-neutral-100 p-0 dark:bg-neutral-800" onClick={() => bcf.restore(vp.guid)}>
          {vp.snapshot ? <img src={vp.snapshot} alt="" className="block max-h-40 w-full object-cover" /> : <div className="grid h-20 place-items-center text-neutral-400"><AimOutlined /></div>}
        </button>
        {vp.pin && <span className="absolute left-2 top-2 grid size-6 place-items-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">{vp.number}</span>}
        <Dropdown menu={{ items: menu }} trigger={['click']}>
          <Button size="small" shape="circle" aria-label="Viewpoint actions" icon={<MoreOutlined />} className="!absolute right-2 top-2" />
        </Dropdown>
      </div>
    );
  };

  const vpByGuid = new Map((active?.viewpoints ?? []).map((v) => [v.guid, v]));
  const commentVps = new Set((active?.comments ?? []).map((c) => c.viewpoint).filter(Boolean));
  const topicOnlyVps = (active?.viewpoints ?? []).filter((v) => !commentVps.has(v.guid));
  const sel = (key: 'status' | 'priority' | 'type' | 'stage', list: string[], required = false) => (
    <Select size="small" className="w-full" value={draft?.[key]} allowClear={!required} options={list.map((v) => ({ value: v, label: v }))}
      onChange={(v) => bcf.updateDraft({ [key]: v })} aria-label={T[key]} />
  );

  return (
    <Card onClose={close} footer={
      editing ? (
        <>
          <Button className="flex-1" onClick={async () => { const isNew = !session?.guid; if (await confirmDiscard()) { bcf.cancelSession(); if (isNew) onClose(); } }}>{T.cancel}</Button>
          <Button className="flex-1" type="primary" disabled={sending} onClick={save}>{T.save}</Button>
        </>
      ) : (
        <>
          <Button className="flex-1" icon={<DeleteOutlined />} onClick={remove}>{T.delete}</Button>
          <Button className="flex-1" icon={<EditOutlined />} onClick={() => bcf.startEdit()}>{T.edit}</Button>
        </>
      )
    }>
      <section className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/50">
        {editing ? (
          <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-xs">
            <label className="col-span-2">{T.title} *<Input size="small" value={draft!.title} placeholder={T.titlePlaceholder} onChange={(e) => bcf.updateDraft({ title: e.target.value })} status={draft!.title.trim() ? '' : 'error'} /></label>
            <label>{T.assignee}<Select size="small" className="w-full" mode="tags" maxCount={1} value={draft!.assignedTo ? [draft!.assignedTo] : []} options={options.users.map((u) => ({ value: u, label: u }))} onChange={(v: string[]) => bcf.updateDraft({ assignedTo: v.at(-1) })} aria-label={T.assignee} /></label>
            <label>{T.due}<DatePicker size="small" className="w-full" value={draft!.dueDate ? dayjs(draft!.dueDate) : null} onChange={(d) => bcf.updateDraft({ dueDate: d ? d.toISOString() : undefined })} /></label>
            <label>{T.status} *{sel('status', options.statuses, true)}</label>
            <label>{T.priority}{sel('priority', options.priorities)}</label>
            <label>{T.type} *{sel('type', options.types, true)}</label>
            <label>{T.stage}{sel('stage', options.stages)}</label>
            <label className="col-span-2">{T.labels}<Select size="small" mode="tags" className="w-full" value={draft!.labels} options={options.labels.map((l) => ({ value: l, label: l }))} onChange={(v) => bcf.updateDraft({ labels: v })} aria-label={T.labels} /></label>
            <label className="col-span-2">{T.description}<Input.TextArea size="small" autoSize={{ minRows: 2, maxRows: 6 }} value={draft!.description} placeholder={T.descriptionPlaceholder} onChange={(e) => bcf.updateDraft({ description: e.target.value })} /></label>
          </div>
        ) : (
          <Descriptions size="small" column={2} layout="vertical" colon={false} items={[
            { key: 't', label: T.title, span: 2, children: <span className="font-medium">{active!.title}</span> },
            { key: 'a', label: T.assignee, children: active!.assignedTo || '—' },
            { key: 'd', label: T.due, children: <span className="text-[var(--accent)]">{active!.dueDate ? dayjs(active!.dueDate).format('MM/DD/YYYY') : '—'}</span> },
            { key: 's', label: T.status, children: <Tag color="blue">{active!.status}</Tag> },
            { key: 'p', label: T.priority, children: active!.priority || '—' },
            { key: 'ty', label: T.type, children: active!.type },
            { key: 'st', label: T.stage, children: active!.stage || '—' },
            { key: 'l', label: T.labels, span: 2, children: active!.labels.length ? active!.labels.map((l) => <Tag key={l}>{l}</Tag>) : '—' },
            ...(active!.description ? [{ key: 'de', label: T.description, span: 2, children: <span className="whitespace-pre-wrap">{active!.description}</span> }] : []),
          ]} />
        )}
      </section>

      <div className="mt-3 flex items-center justify-between">
        <span className="font-semibold">{T.comments}</span>
        <span className="flex gap-1">
          <Tooltip title={T.captureViewpoint}><Button size="small" shape="circle" aria-label={T.captureViewpoint} icon={<CameraOutlined />} onClick={() => bcf.captureViewpoint()} /></Tooltip>
          {!editing && <Tooltip title={T.addComment}><Button size="small" shape="circle" aria-label={T.addComment} icon={<PlusOutlined />} onClick={() => bcf.startEdit()} /></Tooltip>}
        </span>
      </div>

      {topicOnlyVps.map((vp) => <div key={vp.guid}>{viewpointCard(vp)}</div>)}
      {!active?.comments.length && !topicOnlyVps.length && <div className="py-3 text-center text-xs text-neutral-400">{T.noComments}</div>}
      {active?.comments.map((c) => (
        <div key={c.guid} className="mt-2 flex gap-2">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-orange-100 text-[10px] font-bold text-orange-700">{(c.author || '?')[0].toUpperCase()}</span>
          <div className="min-w-0 flex-1 rounded-xl bg-neutral-50 p-2 dark:bg-neutral-800/50">
            <div className="flex items-center justify-between text-[11px] text-orange-700">
              <span className="truncate">{c.author} · {fmt(c.date)}</span>
              {c.editable && <Button size="small" type="text" aria-label={T.removeComment} icon={<CloseOutlined />} onClick={() => bcf.removeComment(c.guid)} />}
            </div>
            {c.editable ? (
              <Input.TextArea size="small" autoSize value={c.text} onChange={(e) => bcf.editComment(c.guid, e.target.value)} />
            ) : (
              <div className="whitespace-pre-wrap text-xs">{c.text}</div>
            )}
            {c.viewpoint && vpByGuid.get(c.viewpoint) && viewpointCard(vpByGuid.get(c.viewpoint)!)}
          </div>
        </div>
      ))}

      {editing && (
        <div className="mt-3 rounded-xl border border-solid border-neutral-200 p-2 dark:border-neutral-700">
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} placeholder={T.commentPlaceholder} value={comment} onChange={(e) => setComment(e.target.value)} aria-label={T.addComment}
            onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); void send(); } }} />
          <div className="mt-2 flex items-center justify-between">
            <Checkbox checked={attachView} onChange={(e) => setAttachView(e.target.checked)}>{T.withViewpoint}</Checkbox>
            <Button type="primary" size="small" icon={<SendOutlined />} loading={sending} disabled={!comment.trim()} onClick={send}>{T.send}</Button>
          </div>
        </div>
      )}

      <SnapshotViewer src={enlarged?.src ?? null} editable={editing} onClose={() => setEnlarged(null)} onSave={(png) => enlarged && bcf.replaceSnapshot(enlarged.vp, png)} />
    </Card>
  );
}

function Card({ children, footer, onClose }: { children: React.ReactNode; footer?: React.ReactNode; onClose(): void }) {
  return (
    <div className="flex max-h-full w-[360px] flex-col overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-neutral-900" role="dialog" aria-label={S.panels.topic}>
      <header className="flex items-center justify-between border-0 border-b border-solid border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <span className="text-lg font-semibold">{S.panels.topic}</span>
        <Button type="text" size="small" aria-label="Close" icon={<CloseOutlined />} onClick={onClose} />
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
      {footer && <footer className="flex gap-2 border-0 border-t border-solid border-neutral-200 p-3 dark:border-neutral-800">{footer}</footer>}
    </div>
  );
}
