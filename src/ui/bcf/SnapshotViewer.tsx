import { useEffect, useRef, useState } from 'react';
import { Button, Modal, Space } from 'antd';
import { EditOutlined, UndoOutlined } from '@ant-design/icons';
import { S } from '../strings';

/** BT-05: enlarged snapshot; in edit mode a pen sketch is drawn on top and saved as a new PNG. */
export function SnapshotViewer({ src, editable, onClose, onSave }: { src: string | null; editable: boolean; onClose(): void; onSave(png: Uint8Array): void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const [sketching, setSketching] = useState(false);
  const [dirty, setDirty] = useState(false);
  const drawing = useRef(false);

  useEffect(() => { setSketching(false); setDirty(false); }, [src]);

  const fitCanvas = () => {
    const c = canvas.current, i = img.current;
    if (!c || !i) return;
    c.width = i.naturalWidth;
    c.height = i.naturalHeight;
  };

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * e.currentTarget.width, ((e.clientY - r.top) / r.height) * e.currentTarget.height] as const;
  };

  const save = async () => {
    const i = img.current!, c = canvas.current!;
    const out = document.createElement('canvas');
    out.width = i.naturalWidth;
    out.height = i.naturalHeight;
    const ctx = out.getContext('2d')!;
    ctx.drawImage(i, 0, 0);
    ctx.drawImage(c, 0, 0);
    const blob = await new Promise<Blob | null>((r) => out.toBlob(r, 'image/png'));
    if (blob) onSave(new Uint8Array(await blob.arrayBuffer()));
    onClose();
  };

  return (
    <Modal open={!!src} onCancel={onClose} width="80vw" centered title={sketching ? S.bcf.topic.sketch : S.bcf.topic.enlarge}
      footer={editable ? (
        <Space>
          {!sketching && <Button icon={<EditOutlined />} onClick={() => setSketching(true)}>{S.bcf.topic.sketch}</Button>}
          {sketching && <Button icon={<UndoOutlined />} disabled={!dirty} onClick={() => { fitCanvas(); setDirty(false); }}>{S.bcf.topic.cancel}</Button>}
          {sketching && <Button type="primary" disabled={!dirty} onClick={save}>{S.bcf.topic.save}</Button>}
        </Space>
      ) : null}>
      {src && (
        <div className="relative">
          <img ref={img} src={src} alt="" className="block w-full" onLoad={fitCanvas} />
          <canvas
            ref={canvas}
            aria-label={S.bcf.topic.sketch}
            className={`absolute inset-0 h-full w-full ${sketching ? 'cursor-crosshair' : 'pointer-events-none'}`}
            onPointerDown={(e) => {
              if (!sketching) return;
              drawing.current = true;
              const ctx = e.currentTarget.getContext('2d')!;
              ctx.strokeStyle = '#e53935';
              ctx.lineWidth = Math.max(3, e.currentTarget.width / 250);
              ctx.lineCap = ctx.lineJoin = 'round';
              ctx.beginPath();
              ctx.moveTo(...pos(e));
            }}
            onPointerMove={(e) => {
              if (!drawing.current) return;
              const ctx = e.currentTarget.getContext('2d')!;
              ctx.lineTo(...pos(e));
              ctx.stroke();
              setDirty(true);
            }}
            onPointerUp={() => { drawing.current = false; }}
          />
        </div>
      )}
    </Modal>
  );
}
