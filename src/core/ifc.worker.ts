// Converts IFC bytes to Fragments bytes off the main thread (FM-02).
import * as FRAGS from '@thatopen/fragments';

export type IfcWorkerRequest = { bytes: Uint8Array };
export type IfcWorkerResponse =
  | { type: 'progress'; progress: number }
  | { type: 'done'; bytes: Uint8Array }
  | { type: 'error'; message: string };

const post = (msg: IfcWorkerResponse, transfer: Transferable[] = []) => self.postMessage(msg, { transfer });

self.onmessage = async ({ data }: MessageEvent<IfcWorkerRequest>) => {
  try {
    const importer = new FRAGS.IfcImporter();
    importer.wasm = { path: '/vendor/', absolute: true };
    const bytes = await importer.process({
      bytes: data.bytes,
      progressCallback: (progress) => post({ type: 'progress', progress }),
    });
    post({ type: 'done', bytes }, [bytes.buffer as ArrayBuffer]);
  } catch (e) {
    post({ type: 'error', message: e instanceof Error ? e.message : String(e) });
  }
};
