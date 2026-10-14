// All UI text in one place (ST-02: English only; swap for i18n later if needed).
export const S = {
  appName: 'BCF Viewer',
  panels: {
    toggle: 'Show / hide panels',
    files: 'File Management',
    trees: 'Model Trees',
    info: 'Element Information',
    bcf: 'BCF Management',
    topic: 'BCF Topic',
    help: 'Help',
    settings: 'Settings',
  },
  welcome: {
    title: 'Free Online IFC Viewer',
    intro: [
      'Explore your buildings right in the browser.',
      'Completely free and optimized for high performance.',
      'Get started by loading your own models or try our example models.',
    ],
    load: 'Load IFC models',
    drop: 'Drag & drop files here',
    browse: 'or click to browse your files',
    example: 'Start with a BIM example model',
    features: [
      'Completely free',
      'Rich toolset',
      'Load .ifc or .frag files',
      'Privacy by design - no server uploads',
      'Import & export .bcf files',
      'Create & edit BCF topics',
    ],
  },
  files: {
    load: 'Load files',
    unloadAll: 'Unload all',
    search: 'Search...',
    downloadFrag: 'Download as .frag',
    unload: 'Unload',
    empty: 'No models loaded',
  },
  webgl2Missing: 'Your browser does not support WebGL2, which is required to display 3D models.',
} as const;
