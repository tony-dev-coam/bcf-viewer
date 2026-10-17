import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Tooltip } from 'antd';
import { filterTopics } from '../../core';
import { useStore, useViewer } from '../viewer';

const PALETTE = ['#4aa3c9', '#b7cf5a', '#f39a5f', '#9b7fd1', '#e5677a', '#5cc6a7', '#d9b44a'];
const colorFor = (value: string | undefined, values: string[]) => (value ? PALETTE[values.indexOf(value) % PALETTE.length] : '#9aa0a6');

/** BT-04 / BM-06: topic pins drawn as an HTML overlay projected from 3D on every camera change. */
interface PinsLayerProps {
  onOpen(topicGuid: string): void;
}

export function PinsLayer({ onOpen }: PinsLayerProps) {
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
              className={`bcf-pin pointer-events-auto absolute cursor-pointer border-0 bg-transparent p-0 ${isActive ? 'is-active z-10' : ''}`}
              style={{ left: x, top: y, color: colorFor(row[pinColorBy] as string | undefined, values) }}
            >
              {/* Survey stake: head + leader line, so the anchor dot sits exactly on the 3D point instead of under a teardrop. */}
              <svg width="32" height="44" viewBox="-16 -40 32 44" overflow="visible" aria-hidden>
                <ellipse cx="0" cy="0" rx="6" ry="2.2" fill="black" opacity=".25" />
                {isActive && <circle className="bcf-pin-ripple" cx="0" cy="0" r="5" fill="none" stroke="currentColor" strokeWidth="2" />}
                <g className="bcf-pin-stake">
                  <line x1="0" y1="0" x2="0" y2="-20" stroke="currentColor" strokeWidth="2" />
                  <circle cx="0" cy="0" r="3" fill="currentColor" stroke="white" strokeWidth="1.5" />
                  <circle cx="0" cy="-28" r={isActive ? 11 : 9} fill="currentColor" stroke={isActive ? '#1b1d21' : 'white'} strokeWidth="2" />
                  {isActive
                    ? <text x="0" y="-24.5" textAnchor="middle" fontSize="11" fontWeight="700" fill="white">{p.number}</text>
                    : <circle cx="0" cy="-28" r="3" fill="white" />}
                </g>
              </svg>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
