import * as THREE from 'three';
import * as OBF from '@thatopen/components-front';
import { createStore } from '../store';
import type { Engine } from '../engine';

export interface Settings {
  theme: 'light' | 'dark';
  outlines: boolean;
  depthShadows: boolean;
  antialiasing: boolean;
  fixMissingFaces: boolean;
}

const KEY = 'viewer.settings';
const DEFAULTS: Settings = { theme: 'light', outlines: true, depthShadows: false, antialiasing: false, fixMissingFaces: false };

function load(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return DEFAULTS;
  }
}

/** ST-01, ST-03 (ST-05: persisted per browser). */
export function createSettingsService(engine: Engine) {
  const store = createStore<Settings>(load());

  function apply(s: Settings) {
    const post = engine.world.renderer!.postproduction;
    const { COLOR, COLOR_PEN, COLOR_SHADOWS, COLOR_PEN_SHADOWS } = OBF.PostproductionAspect;
    post.enabled = true;
    post.style = s.outlines ? (s.depthShadows ? COLOR_PEN_SHADOWS : COLOR_PEN) : s.depthShadows ? COLOR_SHADOWS : COLOR;
    post.smaaEnabled = s.antialiasing;
    for (const [, material] of engine.fragments.core.models.materials.list) {
      material.side = s.fixMissingFaces ? THREE.DoubleSide : THREE.FrontSide;
      material.needsUpdate = true;
    }
    void engine.fragments.core.update(true);
  }

  // New model materials follow the current "fix missing faces" setting.
  engine.fragments.core.models.materials.list.onItemSet.add(({ value }) => {
    value.side = store.getSnapshot().fixMissingFaces ? THREE.DoubleSide : THREE.FrontSide;
  });
  apply(store.getSnapshot());

  return {
    store,
    update(patch: Partial<Settings>) {
      store.update(patch);
      try {
        localStorage.setItem(KEY, JSON.stringify(store.getSnapshot()));
      } catch {
        /* settings still apply for this session */
      }
      apply(store.getSnapshot());
    },
  };
}

export type SettingsService = ReturnType<typeof createSettingsService>;
