// HC-01: in-app help, one section per area. Own wording.
export const HELP: { title: string; intro: string; items: [label: string, text: string][] }[] = [
  { title: 'File Management', intro: 'Load models and follow their loading progress.', items: [
    ['Load files', 'Drop .ifc or .frag files on the viewer or use Load files. Several files load as one federated model. Files never leave your browser.'],
    ['Download as .frag', 'Saves the converted model so it opens much faster next time.'],
    ['Unload', 'Removes a model from the viewer. Unload all removes every model.'],
  ] },
  { title: 'Model Trees', intro: 'Browse the model structure and control what is shown.', items: [
    ['Relations', 'The IFC spatial structure: Project → Site → Building → Storey → Element.'],
    ['Types', 'Elements grouped by IFC class, e.g. IfcWall or IfcSlab.'],
    ['Storeys', 'Storeys across all loaded models; levels within 1 m of each other are merged.'],
    ['Search', 'Filter the tree by name or IFC class.'],
    ['Select rows', 'Click selects in 3D. CTRL adds rows, SHIFT selects a range.'],
    ['Eye and color', 'Show/hide or color all elements of a row. On a selected row they apply to the whole selection.'],
    ['Spaces and openings', 'IfcSpace and IfcOpeningElement are hidden by default; toggle them in the header.'],
  ] },
  { title: 'Element Information', intro: 'Structured IFC data of the selected element.', items: [
    ['Identity', 'GlobalId, name, type and other attributes.'],
    ['Properties', 'All property sets, standard and custom.'],
    ['Quantities', 'Base and derived quantities such as length, area and volume.'],
    ['Relations', 'Containment, aggregation, connections and assignments.'],
    ['Materials', 'Materials, layer sets and constituent sets.'],
  ] },
  { title: 'BCF Management', intro: 'Import, create and export BCF topics.', items: [
    ['Import / export', 'Open .bcf/.bcfzip files (BCF 2.1 or 3.0). Export all or selected topics as 2.1 or 3.0.'],
    ['New topic', 'Creates a topic. The first time you are asked for your name or email.'],
    ['Columns and filters', 'Choose visible columns; filter columns and search. Filters also hide pins of hidden topics.'],
    ['Pins', 'Show or hide topic pins and choose what their color means.'],
  ] },
  { title: 'BCF Topic', intro: 'View and edit one topic with its comments and viewpoints.', items: [
    ['Edit', 'Change fields, then Save. Cancel discards unsaved changes after confirmation.'],
    ['Comments', 'Add comments, optionally with the current view attached. They can be changed until you save.'],
    ['Viewpoints', 'Click a snapshot to return to that view. Refresh, replace or sketch on a snapshot while editing.'],
    ['Pins', 'Place a numbered pin in the model for a viewpoint.'],
  ] },
  { title: 'Navigation', intro: 'Move around the model.', items: [
    ['Orbit', 'Left drag rotates, right/middle drag pans, wheel zooms.'],
    ['Fly', 'Hold the left button to look around. W/S or ↑/↓ move, A/D or ←/→ strafe, SHIFT moves faster.'],
    ['Drone', 'Left drag pans across large sites; right drag rotates.'],
    ['Zoom to all', 'Double-click empty space.'],
  ] },
  { title: 'Camera', intro: 'Projection and standard views.', items: [
    ['Perspective / Orthographic', 'Switch the camera projection.'],
    ['Top / bottom view', 'Look straight down or up at the model.'],
    ['View from plane', 'Click a surface to look at it head-on.'],
  ] },
  { title: 'Color', intro: 'How elements are colored.', items: [
    ['Original colors', 'Material colors from the model.'],
    ['Paper model', 'Everything white; custom colors stay visible.'],
    ['Color items', 'Pick a color and click elements. The eraser removes a color. ESC ends coloring.'],
    ['Remove all custom colors', 'Back to the color mode without custom colors. Custom colors are saved in BCF viewpoints.'],
  ] },
  { title: 'Visibility', intro: 'Hide, isolate and focus.', items: [
    ['Hide / show', 'Hide the selection or show everything again.'],
    ['Isolate', 'Double-click an element, or use Isolate in the model tree.'],
    ['Zoom', 'Zoom to all or to the selection.'],
    ['Reset all', 'Visibility, tools and camera back to their defaults.'],
  ] },
  { title: 'Selection', intro: 'Select elements in 3D.', items: [
    ['Select', 'Click an element. CTRL adds or removes. ESC clears.'],
    ['Marquee', 'Drag a box. Left → right selects elements fully inside; right → left also selects elements it touches.'],
  ] },
  { title: 'Measurement', intro: 'Measure length, area and volume (metric).', items: [
    ['Length', 'Free: click two points. Edge: click an edge.'],
    ['Area', 'Free: click points, double-click or ENTER to finish. Rectangle: two corners. Face: click a face.'],
    ['Volume', 'Click elements to sum their volume.'],
    ['Manage', 'Hover a measurement and press DEL to delete it; ESC cancels an unfinished one.'],
  ] },
  { title: 'Clipping', intro: 'Sections through the model.', items: [
    ['Plane', 'Click a face to cut along it; drag the arrow to move the plane. Up to 10 planes.'],
    ['Box', 'Box around the selection, or click an element when nothing is selected.'],
    ['Toggle', 'Turn clipping off without deleting planes, or hide the plane helpers.'],
  ] },
  { title: 'Settings', intro: 'Look and performance.', items: [
    ['Dark mode', 'Switch between light and dark interface.'],
    ['Model appearance', 'Outlines, depth shadows, antialiasing and double-sided faces. Turn off for speed.'],
  ] },
];
