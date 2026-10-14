import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import { createStore } from '../store';
import type { Engine } from '../engine';
import type { SelectionService } from '../services/selection';
import type { VisibilityService } from '../services/visibility';
import type { ColorService } from '../services/color';
import type { CameraService } from '../services/camera';
import type { Tool, ToolManager } from '../tools/toolManager';
import type { IdMap } from '../services/selectionRules';
import { patchBcfExceptions, patchBcfClippingPlanes, setViewpointExtrasProvider } from '../patches/bcf';
import { bcfToThree, threeToBcf, type V3 } from './viewpointXml';
import type { ClipService } from '../services/clip';
import { normalizeBcfForImport } from './coloring';
import { visibilityForViewpoint, type TopicRow, type TopicFilters } from './helpers';

patchBcfExceptions();
patchBcfClippingPlanes();

export type BcfVersion = '2.1' | '3';
export type PinColorBy = 'status' | 'priority' | 'type';
export interface CommentRow { guid: string; text: string; author: string; date: string; viewpoint?: string; editable: boolean }
export interface ViewpointRow { guid: string; snapshot?: string; pin?: [number, number, number]; number: number }
export interface ActiveTopic extends TopicRow { comments: CommentRow[]; viewpoints: ViewpointRow[] }
export interface TopicDraft {
  title: string; description: string; assignedTo?: string; dueDate?: string;
  status: string; priority?: string; type: string; stage?: string; labels: string[];
}
export interface TopicSession { guid: string | null; draft: TopicDraft; addedComments: string[]; dirty: boolean }
export interface BcfOptions { types: string[]; statuses: string[]; priorities: string[]; stages: string[]; labels: string[]; users: string[] }

const AUTHOR_KEY = 'bcf.author';

const DEFAULTS: BcfOptions = {
  types: ['Issue', 'Clash', 'Request', 'Remark', 'Inquiry', 'Fault'],
  statuses: ['Open', 'In Progress', 'Resolved', 'Closed'],
  priorities: ['Critical', 'Major', 'Normal', 'Minor'],
  stages: ['Design', 'Tender', 'Construction', 'Handover'],
  labels: [],
  users: [],
};

const readAuthor = () => {
  try {
    return localStorage.getItem(AUTHOR_KEY) ?? '';
  } catch {
    return '';
  }
};

/** BM-01…08, BT-01…08 on That Open BCFTopics + Viewpoints. */
export function createBcfService(deps: {
  engine: Engine; tools: ToolManager; selection: SelectionService; visibility: VisibilityService; color: ColorService; camera: CameraService;
  clip: ClipService;
}) {
  const { engine, tools, selection, visibility, color, camera, clip } = deps;
  const { components, world, fragments } = engine;
  const bcf = components.get(OBC.BCFTopics);
  const viewpoints = components.get(OBC.Viewpoints);
  viewpoints.world = world;
  bcf.setup({
    author: readAuthor(),
    version: '3',
    strict: false,
    updateExtensionsOnImport: true,
    ignoreIncompleteTopicsOnImport: false,
    types: new Set(DEFAULTS.types),
    statuses: new Set(DEFAULTS.statuses),
    priorities: new Set(DEFAULTS.priorities),
    stages: new Set(DEFAULTS.stages),
  });

  const pins = new Map<string, [number, number, number]>(); // viewpoint guid → world position
  // Clipping planes per viewpoint (world space). Owned here, not via That Open plane ids, so they survive
  // "delete all planes" and round-trip through BCF (That Open neither creates nor writes them).
  const vpPlanes = new Map<string, { normal: THREE.Vector3; origin: THREE.Vector3 }[]>();
  const forget = (vpGuid: string) => { viewpoints.list.delete(vpGuid); pins.delete(vpGuid); vpPlanes.delete(vpGuid); };

  // BCF ⇄ world: axis swap + the fragments base coordinate system (same as That Open does for cameras).
  // BCF Direction points to the clipped side; a three.js plane keeps the side its normal points to.
  const base = () => fragments.baseCoordinationMatrix;
  const toWorld = (p: V3) => new THREE.Vector3(...bcfToThree(p)).applyMatrix4(base());
  const toBcf = (p: THREE.Vector3) => threeToBcf(p.clone().applyMatrix4(base().clone().invert()).toArray() as V3);
  const dirToWorld = (d: V3) => new THREE.Vector3(...bcfToThree(d)).negate().transformDirection(base());
  const dirToBcf = (n: THREE.Vector3) => threeToBcf(n.clone().negate().transformDirection(base().clone().invert()).toArray() as V3);
  setViewpointExtrasProvider((vpGuid) => {
    const pin = pins.get(vpGuid);
    return {
      planes: (vpPlanes.get(vpGuid) ?? []).map((pl) => ({ location: toBcf(pl.origin), direction: dirToBcf(pl.normal) })),
      pin: pin && toBcf(new THREE.Vector3(...pin)),
    };
  });
  /** Topic created for a "new" session, created lazily so comments/viewpoints can attach before save. */
  let pendingNew: OBC.Topic | null = null;
  const snapshotUrls = new Map<string, { bytes: Uint8Array; url: string }>();

  const store = createStore<{
    rows: TopicRow[]; active: ActiveTopic | null; session: TopicSession | null; options: BcfOptions;
    author: string; pinsVisible: boolean; pinColorBy: PinColorBy; error: string | null; query: string; filters: TopicFilters;
  }>({
    rows: [], active: null, session: null, options: DEFAULTS, author: readAuthor(), pinsVisible: true, pinColorBy: 'status', error: null,
    query: '', filters: {},
  });

  // ---- snapshots ---------------------------------------------------------------------------------------------
  function snapshotUrl(vp: OBC.Viewpoint): string | undefined {
    const bytes = viewpoints.snapshots.get(vp.snapshot) ?? viewpoints.snapshots.get(vp.guid);
    if (!bytes) return undefined;
    const cached = snapshotUrls.get(vp.guid);
    if (cached?.bytes === bytes) return cached.url;
    if (cached) URL.revokeObjectURL(cached.url);
    const type = viewpoints.getSnapshotExtension(vp.snapshot) === 'jpg' ? 'image/jpeg' : 'image/png';
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
    snapshotUrls.set(vp.guid, { bytes, url });
    return url;
  }

  // ---- snapshot rows for React ---------------------------------------------------------------------------------
  const iso = (d?: Date) => (d ? new Date(d).toISOString() : undefined);
  /** Viewpoints of a topic in order: topic viewpoints first, then those only referenced by comments. */
  function topicViewpoints(t: OBC.Topic): OBC.Viewpoint[] {
    const guids = new Set<string>([...t.viewpoints]);
    for (const c of t.comments.values()) if (c.viewpoint) guids.add(c.viewpoint);
    return [...guids].map((g) => viewpoints.list.get(g)).filter((v): v is OBC.Viewpoint => !!v);
  }
  function row(t: OBC.Topic): TopicRow {
    const first = topicViewpoints(t).find((v) => snapshotUrl(v));
    return {
      guid: t.guid, index: t.index, title: t.title, type: t.type, status: t.status, priority: t.priority, stage: t.stage,
      labels: [...t.labels], assignedTo: t.assignedTo, dueDate: iso(t.dueDate), description: t.description,
      creationDate: iso(t.creationDate)!, creationAuthor: t.creationAuthor, modifiedDate: iso(t.modifiedDate), modifiedAuthor: t.modifiedAuthor,
      thumbnail: first && snapshotUrl(first), commentCount: t.comments.size,
    };
  }
  function activeOf(t: OBC.Topic): ActiveTopic {
    const session = store.getSnapshot().session;
    const added = new Set(session && (session.guid ?? pendingNew?.guid) === t.guid ? session.addedComments : []);
    return {
      ...row(t),
      comments: [...t.comments.values()]
        .sort((a, b) => +new Date(a.date) - +new Date(b.date))
        .map((c) => ({ guid: c.guid, text: c.comment, author: c.author, date: iso(c.date)!, viewpoint: c.viewpoint, editable: added.has(c.guid) })),
      viewpoints: topicViewpoints(t).map((v, i) => ({ guid: v.guid, snapshot: snapshotUrl(v), pin: pins.get(v.guid), number: i + 1 })),
    };
  }
  function refresh() {
    const s = store.getSnapshot();
    // A new, unsaved topic is shown in the topic card (with its comments) but not in the list.
    const activeTopic = (s.active && bcf.list.get(s.active.guid)) || (s.session && !s.session.guid ? pendingNew : null);
    store.update({
      rows: [...bcf.list.values()].filter((t) => t !== pendingNew).map(row),
      active: activeTopic ? activeOf(activeTopic) : null,
      options: {
        types: [...bcf.config.types], statuses: [...bcf.config.statuses], priorities: [...bcf.config.priorities],
        stages: [...bcf.config.stages], labels: [...new Set([...bcf.config.labels, ...bcf.usedLabels])], users: [...new Set([...bcf.config.users, ...bcf.usedUsers])],
      },
    });
  }

  // ---- viewpoints --------------------------------------------------------------------------------------------
  async function allGuids(): Promise<string[]> {
    const map: IdMap = {};
    for (const [id, model] of fragments.list) map[id] = new Set(await model.getItemsIdsWithGeometry());
    return fragments.modelIdMapToGuids(map);
  }

  /** Camera + snapshot of the model, without the clipping gizmos in the picture. */
  async function updateCamera(vp: OBC.Viewpoint) {
    vp.world = world;
    const helpers = clip.store.getSnapshot().helpersVisible;
    clip.setHelpersVisible(false);
    try {
      await vp.updateCamera(true);
    } finally {
      clip.setHelpersVisible(helpers);
    }
  }

  /** BT-03: current camera + snapshot + selection + visibility + custom colors + clipping planes. */
  async function capture(): Promise<OBC.Viewpoint> {
    const vp = viewpoints.create();
    await updateCamera(vp);
    vpPlanes.set(vp.guid, clip.planes());
    const sel = await fragments.modelIdMapToGuids(selection.store.getSnapshot().items);
    sel.forEach((g) => vp.selectionComponents.add(g));
    const visibleMap = await visibility.visibleMap();
    const visible = await fragments.modelIdMapToGuids(Object.fromEntries(Object.entries(visibleMap).map(([m, ids]) => [m, new Set(ids)])));
    const visibleSet = new Set(visible);
    const hidden = (await allGuids()).filter((g) => !visibleSet.has(g));
    const vis = visibilityForViewpoint(visible, hidden);
    vp.defaultVisibility = vis.defaultVisibility;
    vis.exceptions.forEach((g) => vp.exceptionComponents.add(g));
    for (const [hex, items] of Object.entries(color.store.getSnapshot().custom)) {
      vp.componentColors.set(hex.replace('#', '').toUpperCase(), await fragments.modelIdMapToGuids(items));
    }
    return vp;
  }

  /** BM-05 / BT-06: restore camera, visibility, selection, colors and clipping. */
  async function restore(vpGuid: string) {
    const vp = viewpoints.list.get(vpGuid);
    if (!vp) return;
    vp.world = world;
    // Not vp.go(): it calls projection.set() un-awaited (even when unchanged), which re-inits the camera
    // mid-transition and leaves it aimed at the model centre instead of the viewpoint.
    const projection = vp.projection === 'Orthographic' ? 'orthographic' : 'perspective';
    if (camera.store.getSnapshot().projection !== projection) await camera.setProjection(projection);
    const p = vp.position;
    const t = p.clone().addScaledVector(vp.direction, 80);
    clip.deleteAll();
    const planes = vpPlanes.get(vpGuid) ?? [];
    for (const pl of planes) clip.addPlane(pl.normal, pl.origin);
    if (planes.length) {
      clip.setEnabled(true);
      clip.setHelpersVisible(false); // show the section, not the plane gizmos (as in the viewpoint's snapshot)
    }
    const fov = (vp.camera as { field_of_view?: number }).field_of_view;
    const three = world.camera.three;
    if (fov && three instanceof THREE.PerspectiveCamera) {
      three.fov = fov;
      three.updateProjectionMatrix();
    }
    await Promise.all([vp.applyVisibility(), world.camera.controls.setLookAt(p.x, p.y, p.z, t.x, t.y, t.z, true)]);
    camera.syncProjection();
    visibility.notifyChanged(!vp.defaultVisibility);
    await selection.set(await vp.getSelectionMap());
    await color.clearCustom();
    for (const [hex, guids] of vp.componentColors) {
      // BCF colors are RRGGBB or AARRGGBB.
      await color.paint(await fragments.guidsToModelIdMap(guids), `#${hex.slice(-6)}`);
    }
  }

  // ---- import / export ---------------------------------------------------------------------------------------
  /**
   * BCFTopics (un)zips with JSZip in async chunks; each chunk otherwise waits behind a 3D frame.
   * Pausing rendering makes import/export time independent of model size / GPU speed.
   */
  async function withoutRendering<T>(fn: () => Promise<T>): Promise<T> {
    const renderer = world.renderer!;
    const wasEnabled = renderer.enabled;
    renderer.enabled = false;
    try {
      return await fn();
    } finally {
      renderer.enabled = wasEnabled;
    }
  }

  async function importFile(file: File) {
    try {
      const { bytes, extras } = normalizeBcfForImport(new Uint8Array(await file.arrayBuffer()));
      const { topics } = await withoutRendering(() => bcf.load(bytes));
      for (const x of extras) {
        if (x.planes.length) vpPlanes.set(x.guid, x.planes.map((pl) => ({ origin: toWorld(pl.location), normal: dirToWorld(pl.direction) })));
        if (x.pin) pins.set(x.guid, toWorld(x.pin).toArray() as [number, number, number]);
      }
      store.update({ error: null });
      refresh();
      return topics.length;
    } catch (e) {
      store.update({ error: e instanceof Error ? e.message : String(e) }); // BM-07
      return 0;
    }
  }

  async function exportFile(guids: string[] | null, version: BcfVersion, fileName = 'topics') {
    bcf.config.version = version;
    const topics = (guids ? guids.map((g) => bcf.list.get(g)) : [...bcf.list.values()]).filter((t): t is OBC.Topic => !!t);
    const blob = await withoutRendering(() => bcf.export(topics)); // pins + clipping planes are written into each viewpoint (patches/bcf.ts)
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: `${fileName}.bcfzip` }).click();
    URL.revokeObjectURL(url);
  }

  // ---- topic session (BT-07) ---------------------------------------------------------------------------------
  const emptyDraft = (): TopicDraft => ({
    title: '', description: '', status: DEFAULTS.statuses[0], type: DEFAULTS.types[0], labels: [], priority: undefined,
  });
  const draftOf = (t: OBC.Topic): TopicDraft => ({
    title: t.title, description: t.description ?? '', assignedTo: t.assignedTo, dueDate: iso(t.dueDate), status: t.status,
    priority: t.priority, type: t.type, stage: t.stage, labels: [...t.labels],
  });

  function ensureSession(): TopicSession {
    const s = store.getSnapshot();
    if (s.session) return s.session;
    if (!s.active) throw new Error('No active topic');
    const session = { guid: s.active.guid, draft: draftOf(bcf.list.get(s.active.guid)!), addedComments: [], dirty: false };
    store.update({ session });
    return session;
  }

  function applyDraft(t: OBC.Topic, d: TopicDraft) {
    t.title = d.title.trim();
    t.description = d.description || undefined;
    t.status = d.status;
    t.type = d.type;
    t.priority = d.priority;
    t.stage = d.stage;
    t.assignedTo = d.assignedTo;
    t.dueDate = d.dueDate ? new Date(d.dueDate) : undefined;
    t.labels = new Set(d.labels);
    for (const l of d.labels) bcf.config.labels.add(l);
  }


  function sessionTopic(): OBC.Topic {
    const session = ensureSession();
    if (session.guid) return bcf.list.get(session.guid)!;
    pendingNew ??= bcf.create({ title: session.draft.title || 'Untitled', type: session.draft.type, status: session.draft.status });
    return pendingNew;
  }

  // ---- pin placement tool (BT-04, BT-08) ---------------------------------------------------------------------
  let pinTarget: { vpGuid: string | null } | null = null; // null vpGuid = new topic + pin
  const pinTool: Tool = {
    async onClick(e) {
      const hit = await tools.pick(e);
      if (!hit || !pinTarget) return;
      const p = hit.point.toArray() as [number, number, number];
      if (pinTarget.vpGuid) {
        pins.set(pinTarget.vpGuid, p);
      } else {
        // Capture before the session exists, so nothing can save/cancel it half-built.
        const vp = await capture();
        await api.startCreate();
        const t = sessionTopic();
        t.viewpoints.add(vp.guid);
        pins.set(vp.guid, p);
        store.update({ session: { ...store.getSnapshot().session!, dirty: true } });
      }
      pinTarget = null;
      tools.exit();
      refresh();
    },
    deactivate() {
      pinTarget = null;
    },
  };
  tools.register('bcf-pin', pinTool);

  const api = {
    store,
    importFile,
    exportFile,
    restore,
    setAuthor(author: string, remember: boolean) {
      bcf.config.author = author;
      try {
        if (remember) localStorage.setItem(AUTHOR_KEY, author);
        else localStorage.removeItem(AUTHOR_KEY);
      } catch {
        /* storage unavailable: author lasts for this session */
      }
      store.update({ author });
    },
    deleteTopics(guids: string[] | null) {
      const list = guids ?? [...bcf.list.keys()];
      for (const g of list) {
        const t = bcf.list.get(g);
        if (!t) continue;
        for (const v of topicViewpoints(t)) forget(v.guid);
        bcf.list.delete(g);
      }
      if (store.getSnapshot().active && list.includes(store.getSnapshot().active!.guid)) store.update({ active: null, session: null });
      refresh();
    },
    /** BM-05: open topic and go to its first viewpoint. Caller confirms discarding a dirty session first. */
    async openTopic(guid: string) {
      const t = bcf.list.get(guid);
      if (!t) return;
      api.cancelSession();
      store.update({ active: activeOf(t) });
      const first = topicViewpoints(t)[0];
      if (first) await restore(first.guid);
    },
    closeTopic() {
      api.cancelSession();
      store.update({ active: null });
    },
    async startCreate() {
      api.cancelSession();
      store.update({ active: null, session: { guid: null, draft: emptyDraft(), addedComments: [], dirty: false } });
    },
    startEdit() {
      ensureSession();
      refresh();
    },
    updateDraft(patch: Partial<TopicDraft>) {
      const s = ensureSession();
      store.update({ session: { ...s, draft: { ...s.draft, ...patch }, dirty: true } });
    },
    /** Returns an error message when required fields are missing (BT-01). */
    saveSession(): string | null {
      const s = store.getSnapshot().session;
      if (!s) return null;
      if (!s.draft.title.trim()) return 'Title is required';
      const t = s.guid ? bcf.list.get(s.guid)! : (pendingNew ??= bcf.create({ title: s.draft.title, type: s.draft.type, status: s.draft.status }));
      applyDraft(t, s.draft);
      if (s.guid) {
        t.modifiedDate = new Date();
        t.modifiedAuthor = bcf.config.author;
      } else {
        t.creationAuthor = bcf.config.author;
      }
      pendingNew = null;
      store.update({ session: null, active: activeOf(t) });
      refresh();
      return null;
    },
    /** Discards the session: removes comments/viewpoints added in it, and a never-saved new topic. */
    cancelSession() {
      const s = store.getSnapshot().session;
      if (!s) return;
      const t = s.guid ? bcf.list.get(s.guid) : pendingNew;
      if (t) {
        for (const c of s.addedComments) {
          const vp = t.comments.get(c)?.viewpoint;
          if (vp) forget(vp);
          t.comments.delete(c);
        }
      }
      if (pendingNew) {
        for (const v of topicViewpoints(pendingNew)) forget(v.guid);
        bcf.list.delete(pendingNew.guid);
        pendingNew = null;
      }
      store.update({ session: null });
      refresh();
    },
    /** BT-02: add a comment (optionally with the current view as viewpoint); editable until save. */
    async addComment(text: string, withViewpoint: boolean) {
      const t = sessionTopic();
      const vp = withViewpoint ? await capture() : null;
      const c = t.createComment(text, vp?.guid);
      if (vp && !t.viewpoints.size) t.viewpoints.add(vp.guid);
      // The session may have been saved/cancelled while the viewpoint was being captured.
      const s = store.getSnapshot().session;
      if (s) store.update({ session: { ...s, addedComments: [...s.addedComments, c.guid], dirty: true } });
      refresh();
      return c.guid;
    },
    editComment(guid: string, text: string) {
      const t = sessionTopic();
      const c = t.comments.get(guid);
      if (c) c.comment = text;
      refresh();
    },
    removeComment(guid: string) {
      const t = sessionTopic();
      const vp = t.comments.get(guid)?.viewpoint;
      if (vp) { forget(vp); t.viewpoints.delete(vp); }
      t.comments.delete(guid);
      const s = store.getSnapshot().session!;
      store.update({ session: { ...s, addedComments: s.addedComments.filter((g) => g !== guid), dirty: true } });
      refresh();
    },
    /** Topic-level viewpoint (BT-03); returns its guid. */
    async captureViewpoint() {
      const t = sessionTopic();
      const vp = await capture();
      t.viewpoints.add(vp.guid);
      store.update({ session: { ...store.getSnapshot().session!, dirty: true } });
      refresh();
      return vp.guid;
    },
    /** BT-05: refresh a viewpoint from the current view. */
    async refreshViewpoint(vpGuid: string) {
      const vp = viewpoints.list.get(vpGuid);
      if (!vp) return;
      await updateCamera(vp);
      vpPlanes.set(vp.guid, clip.planes());
      refresh();
    },
    /** BT-05: replace snapshot bytes (PNG/JPG file or sketch result). */
    replaceSnapshot(vpGuid: string, bytes: Uint8Array) {
      const vp = viewpoints.list.get(vpGuid);
      if (!vp) return;
      viewpoints.snapshots.set(vp.snapshot || vp.guid, bytes);
      refresh();
    },
    snapshotUrlOf(vpGuid: string) {
      const vp = viewpoints.list.get(vpGuid);
      return vp && snapshotUrl(vp);
    },
    /** BT-04: start placing a pin for a viewpoint, or (null) a new topic + pin (BT-08). */
    placePin(vpGuid: string | null) {
      pinTarget = { vpGuid };
      tools.activate('bcf-pin');
    },
    removePin(vpGuid: string) {
      pins.delete(vpGuid);
      refresh();
    },
    setQuery: (query: string) => store.update({ query }),
    setFilters: (filters: TopicFilters) => store.update({ filters }),
    clearError: () => store.update({ error: null }),
    setPinsVisible: (pinsVisible: boolean) => store.update({ pinsVisible }),
    setPinColorBy: (pinColorBy: PinColorBy) => store.update({ pinColorBy }),
    /** All pins of all topics, for the 3D pin layer. */
    allPins(): { topicGuid: string; vpGuid: string; position: THREE.Vector3; number: number }[] {
      const out: { topicGuid: string; vpGuid: string; position: THREE.Vector3; number: number }[] = [];
      for (const t of bcf.list.values()) {
        topicViewpoints(t).forEach((v, i) => {
          const p = pins.get(v.guid);
          if (p) out.push({ topicGuid: t.guid, vpGuid: v.guid, position: new THREE.Vector3(...p), number: i + 1 });
        });
      }
      return out;
    },
  };
  return api;
}

export type BcfService = ReturnType<typeof createBcfService>;
