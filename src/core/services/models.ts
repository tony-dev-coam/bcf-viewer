import { createStore } from '../store';
import type { Engine } from '../engine';
import { convertIfc } from '../convertIfc';

export interface LoadedModel {
  id: string;
  fileName: string;
  status: 'loading' | 'ready' | 'error';
  progress: number; // 0..1
  error?: string;
}

export type FileKind = 'ifc' | 'frag';

export function fileKind(name: string): FileKind | null {
  const ext = name.split('.').pop()?.toLowerCase();
  return ext === 'ifc' || ext === 'frag' ? ext : null;
}

export function uniqueModelId(fileName: string, existing: string[]): string {
  const base = fileName.replace(/\.[^.]+$/, '');
  if (!existing.includes(base)) return base;
  let n = 2;
  while (existing.includes(`${base} (${n})`)) n++;
  return `${base} (${n})`;
}

export function createModelService(engine: Engine, onModelsChanged: () => void) {
  const store = createStore<LoadedModel[]>([]);
  const patch = (id: string, p: Partial<LoadedModel>) =>
    store.set(store.getSnapshot().map((m) => (m.id === id ? { ...m, ...p } : m)));

  async function loadBytes(fileName: string, bytes: Uint8Array) {
    const kind = fileKind(fileName);
    const id = uniqueModelId(fileName, store.getSnapshot().map((m) => m.id));
    store.set([...store.getSnapshot(), { id, fileName, status: 'loading', progress: 0 }]);
    try {
      if (kind === 'ifc') {
        const frag = await convertIfc(bytes, (progress) => patch(id, { progress: progress * 0.9 }));
        await engine.fragments.core.load(frag, { modelId: id, camera: engine.world.camera.three });
      } else if (kind === 'frag') {
        await engine.fragments.core.load(bytes, { modelId: id, camera: engine.world.camera.three });
      } else {
        throw new Error(`Unsupported file type: ${fileName}. Use .ifc or .frag.`);
      }
      patch(id, { status: 'ready', progress: 1 });
      onModelsChanged();
    } catch (e) {
      patch(id, { status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  }

  async function unload(id: string) {
    if (engine.fragments.list.has(id)) await engine.fragments.core.disposeModel(id);
    store.set(store.getSnapshot().filter((m) => m.id !== id));
    onModelsChanged();
  }

  return {
    store,
    /** Files are read in the browser; nothing is uploaded (FM-05). Loaded sequentially to bound memory. */
    async load(files: Iterable<File>) {
      for (const f of files) await loadBytes(f.name, new Uint8Array(await f.arrayBuffer()));
    },
    async loadUrls(urls: string[]) {
      for (const url of urls) {
        const res = await fetch(url);
        await loadBytes(url.split('/').pop()!, new Uint8Array(await res.arrayBuffer()));
      }
    },
    unload,
    async unloadAll() {
      for (const m of store.getSnapshot()) await unload(m.id);
    },
    async downloadFrag(id: string) {
      const model = engine.fragments.list.get(id);
      if (!model) return;
      const buffer = await model.getBuffer(false);
      const url = URL.createObjectURL(new Blob([buffer]));
      Object.assign(document.createElement('a'), { href: url, download: `${id}.frag` }).click();
      URL.revokeObjectURL(url);
    },
  };
}

export type ModelService = ReturnType<typeof createModelService>;
