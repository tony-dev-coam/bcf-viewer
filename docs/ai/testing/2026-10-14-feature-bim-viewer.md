---
phase: testing
title: BIM / IFC Web Viewer — Testing
description: Test coverage for Phase 1, how to run it, and remaining gaps
---

# Testing Strategy

## Test Coverage Goals

- **Unit (Vitest, jsdom):** all pure logic in `src/core`, plus BCF round-trip fidelity.
- **End-to-end (Playwright, Chromium + SwiftShader):** every user-facing requirement area through the real UI.
- **Fixtures:**
  - `public/examples/school_str.ifc` (MIT) exercises the IFC worker path.
  - The example button loads the office ARC/STR/ELE/HVAC `.frag` files (~46 MB, ~30 s under SwiftShader) plus `demo.bcfzip` (19 topics).
  - buildingSMART BCF-XML test cases are used locally only (licence unclear): `BCF_SAMPLES=<dir> npx vitest run src/core/bcf`.

## Unit Tests (66 with samples, 32 without)

- `store.test.ts`: snapshot identity, subscribe/unsubscribe, update merge.
- `services/models.test.ts`: model ID de-duplication; `.ifc`/`.frag` detection, unsupported files.
- `services/selection.test.ts`: click replaces, CTRL toggles, empty-space click clears, no mutation.
- `services/elementInfo.test.ts`: identity, psets, qtos, materials (layer set and type), relations.
- `services/trees.test.ts`: relations tree, types grouping across models, federated storey merge within ±1 m.
- `bcf/helpers.test.ts`: viewpoint visibility exceptions; topic search and column filters.
- `bcf/coloring.test.ts`: 3.0 wrap/unwrap; 2.1 empty-coloring removal.
- `bcf/roundtrip.test.ts`: topic, labels, due date, comment, selection, exceptions and colors survive 2.1 and 3.0. Proven to fail without the exceptions patch.
- `bcf/roundtrip.spike.test.ts`: 17 buildingSMART cases × export to 2.1 and 3.0, 34 round trips, all passing (S1).

## End-to-End Tests (18)

| Spec | Covers |
|---|---|
| load-model | example ARC+STR + demo BCF (8 topics, pins); IFC worker + `.frag` download; no off-origin requests (FM-05) |
| selection | click select, ESC clear |
| marquee-settings | window vs crossing box; dark mode + outlines persisted; help sections |
| element-info | IFCSLAB identity, properties, materials |
| trees | relations/types/storeys, tree → 3D selection, eye toggle, search |
| camera | ortho/persp, top view, fly WASD movement |
| measure | length free + delete all + ESC; area face (regression for the Area patch) |
| clip | plane on face, toggle, delete, materials receive planes (regression); box = 6 planes |
| color | paint selection at once, paper mode, clear |
| bcf | author prompt, create topic + comment with view, export 2.1, delete all, re-import; discard prompt; new topic + pin |

**Run notes:** 2 workers, expect timeout 15 s. With more parallel SwiftShader pages, clicks time out from CPU starvation. The suite was stable over 3 consecutive runs.

## Gaps

- No coverage report (no `@vitest/coverage-v8` yet). WebGL-bound services are covered by e2e only.
- Not run yet:
  - Firefox, WebKit or Edge projects
  - FPS benchmark on a 200 MB model
  - unload/reload memory-leak check
  - 1024 px layout check
- Not tested:
  - BCF opened in a third-party tool (Solibri/BIMcollab)
  - sketch save and snapshot replace (implemented, tested manually only)
  - pin colour-by settings
  - topic column settings and filters through the UI (filter logic is unit-tested)
