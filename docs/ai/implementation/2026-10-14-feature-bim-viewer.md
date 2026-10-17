---
phase: implementation
title: BIM / IFC Web Viewer — Implementation Notes
description: What shipped in Phase 1, how it is organised, deviations from design, and known limits
---

# Implementation Guide

Requirements: `../requirements/feature-bim-viewer.md` · Design: `../design/2026-10-14-feature-bim-viewer.md` · Repo: github.com/tony-dev-coam/bcf-viewer (branch `feature-bim-viewer`).

## Development Setup

- Node 24, `npm install`. A `postinstall` step copies `web-ifc.wasm` and the fragments worker into `public/vendor/`, which is gitignored.
- `npm run dev` (Vite), `npm test` (Vitest), `npm run e2e` (Playwright, SwiftShader WebGL, 2 workers), `npm run build`.
- **web-ifc is pinned to exactly 0.0.77.** Version 0.0.78 changes `StreamMeshes`, which breaks the fragments 3.4 importer.
- Demo BCF generator: `npx playwright test -c scripts/playwright.demo.config.ts` rewrites `public/examples/demo.bcfzip` (19 topics pinned on office-model elements by GUID; takes a few minutes).
- Example models (`public/examples/office_*.frag`): source IFCs come from the VTT BIM4LCA office (see `LICENSES.md`). Rebuild: `python3 scripts/slim-ifc.py HVAC_….ifc office_hvac.ifc FI_Komponentti FI_Asennus FI_Sijainti FI_Geometria` (HVAC only: 60 MB → 34 MB frag), then `node --max-old-space-size=12288 scripts/ifc-to-frag.mjs *.ifc`.

## Code Structure

```
src/core/                 no React; testable headless
  engine.ts               Components, world, PostproductionRenderer, ortho/persp camera, fragments worker
  store.ts                Store<T> (getSnapshot/subscribe) for useSyncExternalStore
  convertIfc.ts, ifc.worker.ts   IFC → fragments in a dedicated worker (FM-02)
  services/               models, visibility, selection(+Rules), trees(+treeService), elementInfo, camera,
                          measure, clip, color, settings
  tools/                  toolManager (single active tool), select, marquee, viewFromPlane
  bcf/                    service (topics, sessions, viewpoints, pins, import/export), helpers, coloring
  patches/                upstream That Open fixes (see below)
  index.ts                createViewer() wiring + resetAll + elementInfo
src/ui/                   React + antd + Tailwind; strings.ts (English only), help.ts, theme.ts
  layout/ Rail, Dock, Toolbar   panels/ Files, Trees, ElementInfo, Settings, Help
  bcf/ BcfListPanel, BcfTopicPanel, PinsLayer, SnapshotViewer (sketch), AuthorDialog, useConfirmDiscard
e2e/                      Playwright specs + helpers   scripts/   demo BCF generator
```

## Implementation Notes

- **State:** each service owns a `Store`. React reads stores and never keeps a copy of viewer state (D3).
- **Tools:** `ToolManager` routes canvas pointer events and keyboard input to the single active tool. A click is a pointer up with less than 4 px of movement. ESC falls back to Select.
- **Colors:** colors are Highlighter styles with priorities: paper (-1) < custom (1) < selection (max). This lets custom colors survive selection changes.
- **BCF:**
  - That Open `BCFTopics`/`Viewpoints` provide the data model.
  - A session tracks comments added since the last save, plus a lazily created `pendingNew` topic for unsaved new topics.
  - Pins are stored in a `pins.json` sidecar inside the `.bcfzip`, in viewer world coordinates.
- **Viewpoint capture:** stores camera and snapshot, selection, visibility (whichever of hidden/visible is the shorter list, as exceptions), custom colors and enabled clip planes.

### Upstream That Open issues patched (`src/core/patches`)

| Issue (components 3.4.x) | Fix | Test |
|---|---|---|
| `Viewpoint.createComponentTags` writes selection GUIDs as `<Exceptions>` | patch prototype | `bcf/roundtrip.test.ts` (fails without patch) |
| `Viewpoint.serialize` omits `<ClippingPlanes>` | append after camera | export path |
| Coloring: no 3.0 `<Components>` wrapper on export or import; empty `<Coloring/>` invalid in 2.1 | `bcf/coloring.ts` (export patch + zip normalisation on import) | `bcf/coloring.test.ts`, round trip |
| `Area.computePlane` uses the first 3 points (collinear → area 0, so "Area face" never creates a measurement) | non-collinear triple | `e2e/measure.spec.ts` |
| Fragments materials ignore global renderer clipping planes | `clipper.localClippingPlanes = true` + `model.useClippingPlanes()` | `e2e/clip.spec.ts` asserts materials get the planes |

### Interop fixes from the review against the reference viewer (2026-10-14)

These were found by importing crais's own example models and BCF. The files are kept locally in the gitignored `test-fixtures/crais/`, and `e2e/crais-compat.spec.ts` skips when they're absent.

- **Pins:** written as a standard zero-length `<Line>`, the same way crais writes them. Our `pins.json` sidecar is removed, which overrides design decision D4.
- **Clipping planes:**
  - `BcfService` now owns each viewpoint's planes: recreated on restore, written on export, read on import. That Open neither creates nor writes them.
  - BCF `Direction` points to the clipped side.
  - The base coordinate system is applied to planes the same way That Open applies it to cameras.
- **Viewpoint restore:**
  - No longer uses `Viewpoint.go()`.
  - Applies the viewpoint's field of view.
  - Hides the plane gizmos, and leaves them out of captured snapshots.
- **Camera after loading:** a late fit-all after the model tree rebuild used to override camera moves made in the meantime. It now fits first.
- **Theme:** defaults to the OS preference until the user picks one.

### Design deviations

- **Example set:** ARC + STR only. No MIT-licensed MEP model was found.
- **CL-06 section caps:** moved to P2. Not present in the reference, and they cost seconds of main-thread time per plane.
- **Drone mode:** orbit with left-drag pan, an approximation of the reference.
- **DEL deletes a measurement** only while a measurement tool is active.
- **BCF import pauses rendering** while it runs. JSZip's async chunks otherwise wait behind every 3D frame.

## Known limits / follow-ups

- **LY-03 (P1):** there's no dock/undock toggle for panels; only the BCF Topic card floats. **Gap.**
- **Pins and clipping planes:** both use the fragments base coordinate system, the first loaded model. Load order must match the file's authoring order, which is also true for That Open cameras.
- **Element info:** one `getItemsData` request follows the shared relation graph. A material shared by many elements makes it heavy.
- **Not yet verified:** Firefox, Safari and Edge runs; FPS and memory-leak checks; layout at 1024 px.
