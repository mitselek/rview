# rview

A render preview for 3D-print toolpaths: the drawn model and the gcode's beads as lit solids in
one browser scene, so you can inspect the model and its slicing in the same place at the same zoom.

Live: <https://mitselek.github.io/rview/>

## What it does

- One slider: **model** (the drawn part) → **print** (the beads as laid, in the plastic's colour) →
  **gcode** (the beads coloured by strategy). In between, the model fades to glass over the beads.
- Opacity per strategy (the single-path skin and each slicer line type), a height cut and a rough
  half section.
- Hop arrows at the gcode end: where the strand is cut (the arrow's tip at the cut) and where it
  starts again (its tail there); green heading outward, magenta inward, red flagged.
- Time travel, on the right edge: a slider from zero (bottom) to the total print time (top). At the
  very top the whole print shows. Anywhere else a marker stands on the nozzle's spot at "now", the
  beads laid around that moment show fully and the rest fade, into the past and the future alike,
  down to a faint ghost. Beside it are jogs, controls that spring back to the centre and change a
  value while held off-centre: one travels in time (a slow creep near the centre, the whole print
  in seconds at the end stop), two set the fade's length and its profile (soft falloff to sharp
  edge). A switch makes the view follow the nozzle. The jogs and the switch hide at the top.
- Navigation: drag turns around the point you grab (up stays up), right-drag or shift-drag pans,
  the wheel zooms to the pointer, double-click centres a spot, `f` fits the part, `c` copies the
  view into the address bar. Axis hairlines (x red, y green, z blue), each with an arrowhead
  and its letter on the positive side, cross at the turning point while you turn and sit at the
  part's origin at rest.

## Data

`index.html?file=<moves.json>&stl=<part.stl>[&flip=1]`. With no `file` the demo loads: a 25 mm
conical roller with a twill skin (`data/m3u31.json`, `data/m3u31.stl`).

The JSON holds one entry per gcode move in columns (`seg.x0 … z1`, `w` bead width, `kind`
0 bead / 1 travel / 2 retract, `src` 1 for the single-path skin, `type` index into `meta.types`)
plus `meta.height` (layer height), `meta.count`, `meta.centre` and the `hops` list (`x y z`, `dir`,
`vec`, `radial`, `flags`). The extractor that writes it is not in this
repository yet.

## Limits

- Time comes from each move's own feed rate: no acceleration and no heating, so the total is a
  little under the slicer's estimate.
- Beads are drawn exactly as the gcode says: round and unfused. A real print's surface is
  flatter than this.
- The section's cut faces are a shading trick, not real caps.
- The model's print orientation is not known to the viewer: `flip=1` turns it upside down.
- three.js loads from unpkg; no build step. Tested on desktop Chromium with a mouse only.

`shot.mjs` takes headless screenshots through the DevTools protocol (node ≥ 22 and Brave or
Chromium; the browser path is set at the top of the file).
