import type { IfcWorkerResponse } from './ifc.worker';

/** One short-lived worker per file: web-ifc memory is fully released when it terminates. */
export function convertIfc(bytes: Uint8Array, onProgress: (p: number) => void): Promise<Uint8Array> {
  const worker = new Worker(new URL('./ifc.worker.ts', import.meta.url), { type: 'module' });
  return new Promise<Uint8Array>((resolve, reject) => {
    worker.onmessage = ({ data }: MessageEvent<IfcWorkerResponse>) => {
      if (data.type === 'progress') onProgress(data.progress);
      else if (data.type === 'done') resolve(data.bytes);
      else reject(new Error(data.message));
    };
    worker.onerror = (e) => reject(new Error(e.message || 'IFC conversion worker crashed'));
    worker.postMessage({ bytes }, [bytes.buffer as ArrayBuffer]);
  }).finally(() => worker.terminate());
}
