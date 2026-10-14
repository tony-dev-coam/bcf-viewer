import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Tooltip } from 'antd';
import { filterTopics } from '../../core';
import { useStore, useViewer } from '../viewer';

const PALETTE = ['#4aa3c9', '#b7cf5a', '#f39a5f', '#9b7fd1', '#e5677a', '#5cc6a7', '#d9b44a'];
const colorFor = (value: string | undefined, values: string[]) => (value ? PALETTE[values.indexOf(value) % PALETTE.length] : '#9aa0a6');

/** BT-04 / BM-06: topic pins drawn as an HTML overlay projected from 3D on every camera change. */
export function PinsLayer({ onOpen }: { onOpen(topicGuid: string): void }) {
  const viewer = useViewer();
  const { rows, query, filters, pinsVisible, pinColorBy, active } = useStore(viewer.bcf.store);
  const [, setFrame] = useState(0);

  useEffect(() => {
    let raf = 0;
    const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; setFrame((f) => f + 1); }); };
    const controls = viewer.engine.world.camera.controls;
    controls.addEventListener('update', schedule);
    window.addEventListener('resize', schedule);
    return () => { controls.removeEventListener('update', schedule); window.removeEventListener('resize', schedule); cancelAnimationFrame(raf); };
  }, [viewer]);

  const visibleTopics = useMemo(() => new Set(filterTopics(rows, query, filters).map((r) => r.guid)), [rows, query, filters]);
  const byGuid = useMemo(() => new Map(rows.map((r) => [r.guid, r])), [rows]);
  const values = useMemo(() => [...new Set(rows.map((r) => r[pinColorBy]).filter(Boolean) as string[])].sort(), [rows, pinColorBy]);
  if (!pinsVisible) return null;

  const cam = viewer.engine.world.camera.three;
  const dom = viewer.engine.world.renderer!.three.domElement;
  const { width, height } = dom.getBoundingClientRect();
  const v = new THREE.Vector3();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-label="Topic pins">
      {viewer.bcf.allPins().map((p) => {
        if (!visibleTopics.has(p.topicGuid)) return null;
        v.copy(p.position).project(cam);
        if (v.z > 1 || v.z < -1) return null; // behind the camera
        const x = ((v.x + 1) / 2) * width, y = ((1 - v.y) / 2) * height;
        const row = byGuid.get(p.topicGuid)!;
        const isActive = active?.guid === p.topicGuid;
        return (
          <Tooltip key={p.vpGuid} title={row.title}>
            <button
              aria-label={`Pin: ${row.title}`}
              onClick={() => onOpen(p.topicGuid)}
              className="pointer-events-auto absolute -translate-x-1/2 -translate-y-full cursor-pointer border-0 bg-transparent p-0"
              style={{ left: x, top: y }}
            >
              <svg width="26" height="36" viewBox="0 0 24 36" aria-hidden>
                <path d="M12 0C5.383 0 0 5.383 0 12c0 9 12 24 12 24s12-15 12-24C24 5.383 18.617 0 12 0z" fill={colorFor(row[pinColorBy] as string | undefined, values)} stroke={isActive ? '#1b1d21' : 'white'} strokeWidth="1.5" />
                {isActive ? <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="700" fill="white">{p.number}</text> : <circle cx="12" cy="12" r="4.5" fill="white" />}
              </svg>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
