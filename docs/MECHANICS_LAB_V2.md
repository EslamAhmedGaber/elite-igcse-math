# Elite Mechanics 1 Laboratory V2

## Product Goal

The WME01 laboratory must make Mechanics visible before it becomes algebra. The active experiment is therefore the first screen, while search and the full case library remain directly below it.

The verified 98-case physics catalogue is retained. The V2 work replaces the old presentation hierarchy and adds a second synchronized visual representation rather than discarding the tested case engine.

## Design Evidence

- [PhET](https://phet.colorado.edu/en/about) emphasizes immediate feedback, productive constraints, real-world connection, and multiple representations such as motion, graphs, and numbers.
- [Open Source Physics](https://www.compadre.org/osp/) combines simulations with modeling, data analysis, and curriculum material.
- [MIT OpenCourseWare classical mechanics](https://ocw.mit.edu/courses/12-620j-classical-mechanics-a-computational-approach-fall-2008/) describes computation as a way to make mechanics precise and actively explorable.

The Elite translation is exam-specific: one physical scene, one synchronized analysis view, live values, exact WME01 symbols, the governing formula trail, and concise exam moves.

## Coverage Freeze

| Topic | Cases | Main visual treatment |
|---|---:|---|
| Quantities, Units and Modelling | 9 | Model decision map and unit boards |
| Working with Vectors | 11 | Vector scene and signed component comparison |
| Kinematics Graphs | 9 | Gradient/area graph with live time marker |
| Constant Acceleration in 1D | 9 | Motion scene plus aligned s-v-a graphs |
| Constant Acceleration in 2D | 10 | Vector motion plus synchronized x-y trajectory |
| Forces and Equilibrium | 12 | Free-body scene plus resultant component view |
| Newton's Second Law | 7 | System motion plus force/mass/acceleration quantities |
| Inclined Planes | 10 | Resolved-force scene plus signed force comparison |
| Momentum, Impulse and Collisions | 11 | Collision scene plus before/after signed momentum |
| Moments | 10 | Beam/pivot scene plus signed turning effects |
| **Total** | **98** | **Every case has scene, values, analysis, method, and controls** |

## Workbench Contract

### First viewport

- Course and experiment selector.
- Icon-led 10-topic dock.
- Physical model and synchronized analysis graph.
- Scene, Split, and Graph modes.
- Live readout strip.
- Play, Pause, Step, Reset, and six playback speeds: 0.1x, 0.25x, 0.5x, 1x, 2x, and 4x.
- Image capture and fullscreen/theatre presentation mode.

### Inspector

- Overview: purpose, tags, and successive case sequence.
- Variables: sliders, numeric inputs, symbols, units, and copyable data snapshot.
- Method: formula trail and exam moves.
- Native tab semantics with Arrow Left, Arrow Right, Home, and End keyboard navigation.

### Library

- Search by topic, case, symbol, unit, or exam word.
- Five signature experiments with local Play and Reset controls.
- Every case card includes topic identity, visual type, symbols, and local Play and Reset controls.

## Visual Rules

- Brand navy is the scientific stage, not the whole page palette.
- Royal blue, sky, teal, gold, coral, green, and violet have stable semantic roles.
- Color is always paired with labels, signs, lines, or icons.
- Mathematical units use proper superscript rendering.
- The canvas adapts its geometry on narrow screens; labels must not overlap.
- Mobile starts in Scene mode and can switch to Graph or Split.
- Reduced-motion preferences shorten interface transitions without removing user-controlled simulation playback.

## Verification Contract

Automated:

- `node --check ial/wme01/lab/assets/mechanics-lab.js`
- `node tools/test_mechanics_lab.js`
- `python tools/verify_pipeline.py`

Browser:

- Exercise all 98 case selectors.
- Confirm at least three live values and two analysis legend entries per case.
- Run Play and Reset in every topic.
- Verify Scene, Split, and Graph modes.
- Verify all six speeds.
- Verify image capture creates a PNG.
- Verify fullscreen or theatre fallback.
- Verify search, local card controls, inspector tabs, and keyboard navigation.
- Test 1440 x 1000 and 390 x 844 with no page overflow or console errors.

## Release Files

- `ial/wme01/lab/index.html`
- `ial/wme01/lab/assets/mechanics-lab.css`
- `ial/wme01/lab/assets/mechanics-lab.js`
- `tools/test_mechanics_lab.js`
- `tools/verify_pipeline.py`
- `service-worker.js`
