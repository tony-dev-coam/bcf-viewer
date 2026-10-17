# Example model licences

| File | Source | Licence |
|---|---|---|
| office_arc.frag, office_str.frag, office_ele.frag, office_hvac.frag | "BIM4LCA" office building, concrete version, building-permit stage (ARK_/STRUC_/ELE_/HVAC_NordicLCA_Office_Concrete_BuildingPermit.ifc) by VTT and partners, https://cris.vtt.fi/en/publications/bim-files-to-download/ — converted to Fragments with scripts/ifc-to-frag.mjs; office_hvac had its FI_Komponentti, FI_Asennus, FI_Sijainti and FI_Geometria property sets removed (scripts/slim-ifc.py) to cut size | CC BY-SA 4.0 (adaptations shared under the same licence) |
| school_str.ifc  | https://github.com/ThatOpen/engine_components (resources/ifc) — used by e2e tests for the IFC worker path | MIT |
| demo.bcfzip     | Authored for this project (scripts/make-demo-bcf.spec.ts); topics reference elements of the office models | MIT |
