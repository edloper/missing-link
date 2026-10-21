# Code review — 2026-10-20

Reviewed the application scripts, all four pages, stylesheet, all 12 levels,
local server and deployment configuration. The original review added tests without runtime changes. Fixed entries below
now describe the subsequent repairs; their original explanations and source
locations are retained as historical context. Published levels are unchanged.
High priority means broken core interaction or possible loss of work/progress;
medium means incorrect behavior in a supported workflow; low means limited
helper/API usage or maintainability.

## Reproduced issues

Each R ID is used by tests so later fixes can promote a desired-behavior
assertion to a normal passing regression test. Node reproductions live in
`tests/known-bugs.cjs`; browser reproductions in `tests/browser-tests.js`.

### R2 — High: dot touch handlers use mouse coordinates

**Fixed:** Game dots and editor dots/triangles route touch events through the touch coordinate and pinch handlers.

`javascript/game.js:266`, `javascript/editor.js:436`, `javascript/editor.js:453`

Dot touchstart (and editor triangle touchstart) calls `mouseDown`, which reads
`event.clientX/clientY`. Touch coordinates are in `event.touches[0]`. In the
real SVG browser test, touching a dot at graph (156, 56) starts the click at
(-150, -39.5). Drag thresholds therefore compare against the wrong origin,
and touches on dots skip the touch-specific pinch transitions. Edge touch
handlers already use `touchStart`. Reproduced in
Node and with bubbling DOM events in Chromium. The exact incorrect coordinates
depend on layout; this is not a real-phone test.

### R3 — High: invalid saved data can prevent startup

**Fixed:** Save codes validate nested progress; startup drops invalid records while retaining valid records, and edge restoration skips malformed pairs.

`javascript/level_picker.js:62`, `javascript/level_picker.js:233`,
`javascript/game.js:97`

Save-code validation only checks that `levels` is a non-null object. A code
containing `{levels: {a: {progress: 42}}}` is accepted, then fails when defaults
are assigned. Arrays and other invalid nested shapes also pass the decoder.
Directly stored `{levels: 42}` throws on startup. A null item in progress.edges
throws before later valid edges are restored. JSON parse errors are caught;
schema errors are not. Code import saves accepted data before reloading, so a
bad code can leave subsequent launches broken until storage is repaired. Node
reproduces decoder, loader and edge errors.

### R6 — High: failed level import destroys the current graph

`javascript/editor.js:387`, `javascript/game.js:259`, `javascript/graph.js:139`

Both controllers clear the graph before parsing input. The editor also clears
title/image state first, then records undo only after success. Importing `{`
over a populated graph throws and leaves it empty. Valid JSON with bad
dots/corners can leave partial state. A future fix should validate before
applying changes. Node reproduces loss of the game graph; a browser test
reproduces loss of the editor graph and title.

### R1 — Medium: Hint/Undo can throw during an active drag

**Fixed:** Hint and Undo cancel any unfinished drag before inspecting connected edges.

`javascript/game.js:300`, `javascript/game.js:352`, `javascript/game.js:504`

Start dragging from a dot, then press H. Hint treats the unfinished edge as
incorrect and calls `hideTrianglesForEdge`, dereferencing `edge.end.index`
although end is null. Undo's edge lookup also dereferences unfinished edges
when scanning a dot with both history and a live drag. The drag/history can
be left inconsistent. Both reproduce in Node; Hint also reproduces with real
SVG objects in the browser.

### R4 — Medium: locks are reconstructed incorrectly for sparse progress

`javascript/level_picker.js:253`, `javascript/level_picker.js:219`

`prevLevelIsFinished` updates only when a saved record exists, and defaults are
added after unlocking. With only a locked second-level record, the missing
first level is treated as finished and the second unlocks. With only a finished
first-level record, a missing second record is created locked instead of
unlocked. Relevant to legacy cookies, imports and new levels. Both Node-tested.

### R5 — Medium: zoom clamps against the previous zoom level

`javascript/mouse_handler.js:258`

Bounds use `this.zoomLevel` before applying the new factor. Zooming from 1 to
2 at canvas center (300, 200) yields offset (0, 0), rather than anchored
(150, 100). Zooming back to 1 from the lower/right boundary can retain
(300, 200), showing space beyond the canvas. Both have Node reproductions.

### R7 — Medium: dot deletion is not one undoable editor action

`javascript/editor.js:248`, `javascript/editor.js:441`

Deleting a dot records each triangle deletion, then a separate dot deletion.
One Undo restores only the dot; triangles remain absent until more undos.
These events lack the multistep grouping used by subdivision. Node and browser
tests reproduce a two-triangle graph returning with only one triangle.

### R8 — Medium: color sampling can produce invalid saved colors

`javascript/editor.js:792`, `javascript/editor.js:813`

`getPixel` does not clamp/validate coordinates. At x equal to canvas width it
reads the next row; at the last row or outside the canvas it reads undefined
components. Averages become NaN, serialized as null. Dots can reach the border
through dragging/transforms/imports. Node reproduces non-finite components
from a triangle touching a 2×2 canvas boundary.

### R14 — Medium: shortcuts conflict with browser/text editing

`javascript/game.js:176`, `javascript/editor.js:220`

The game's final `else { return; }` belongs to the separate Ctrl-Right check.
Undo, Hint and Backspace therefore return before preventDefault. Browser
actions may also run. The editor intercepts Ctrl/Cmd-Z and graph transforms
even while title/filename fields have focus; text undo can delete graph
objects instead. Both errors have browser reproductions.

### R15 — Medium: graph transforms bypass and invalidate undo

`javascript/editor.js:707`, `javascript/editor.js:248`

Ctrl/Cmd +/- and arrow transforms mutate every dot without an undo event.
Undo then acts on an unrelated earlier action, or cannot find a dot at its
previously recorded coordinates. Browser reproduction transforms a fresh
fixture, calls Undo, and observes the dots still transformed.

### R16 — Medium: loaded background and color controls disagree

`javascript/editor.js:406`, `javascript/colorpicker.js:53`

Loading changes backgroundColor but leaves the picker at 180/50/90. Adjusting
one slider then replaces the other components with stale values. The picker
is not retained for synchronization; ColorPicker.setColor also doesn't move
slider handles. Browser test loads hue 30 and observes slider hue 180.

### R19 — Medium: image failure can leave thumbnail export pending

`javascript/svg_to_png.js:21`, `javascript/editor.js:326`

svgToPng registers onload without onerror, so its promise never settles after
image decode failure. saveLevel hides dots/background before conversion and
restores them only on success, without rejection cleanup. Browser fault
injection simulates an image failure and observes a pending promise. Normal
thumbnail conversion also has a passing browser test.

### R20 — Medium: JSON file import corrupts non-ASCII text

`javascript/editor.js:141`, `javascript/game.js:142`

FileReader reads a data URL, then atob produces a byte string passed directly
to JSON.parse without UTF-8 decoding. A title such as `猫 — dance` becomes
mojibake. Browser test supplies a real File through the editor input. The
hidden game file input has the same decoding pattern.

### R9 — Low: one malformed cookie escape prevents migration

`javascript/level_picker.js:295`

The entire cookie string is decoded outside error handling. With no stored
progress and `unrelated=100%`, migration throws URIError and the picker cannot
start. This includes cookies unrelated to the game. Node reproduction.

### R10 — Low/medium: overlap checking misses duplicate triangles

`javascript/shapes.js:49`, `javascript/editor.js:576`

Only strict edge crossings count; identical triangles and containment return
false. The editor's independent dot-in-triangle check covers many containment
cases, but cannot flag duplicates using the same three dot objects. Selecting
the same three dots twice creates duplicates without warnings. Both helper
cases have Node reproductions.

### R11 — Low: degenerate triangles and endpoint proximity

`javascript/shapes.js:30`, `javascript/shapes.js:96`

Three coincident corners make isPointInTriangle return true everywhere.
Import/triangle creation has no area/duplicate-point validation.
circleIntersectsLine expands endpoint bounds by radius/2: a radius-7 circle
6 pixels beyond an endpoint is incorrectly rejected, affecting subdivision
and warnings. Both cases have Node reproductions.

### R12 — Low: Graph's optional callbacks lose their receiver

`javascript/graph.js:148`, `javascript/graph.js:152`

`(addDot ?? this.addDot)(x, y)` invokes the fallback without this.
`graph.loadFromJson(text)` throws when the optional callbacks are omitted.
Current controllers pass wrappers and avoid this path. Node reproduction.

### R13 — Low: moving a scaled dot changes its hit target

`javascript/graph.js:360`

Construction uses clickCircleRadius * dotSize, but move resets to unscaled
clickCircleRadius. With dotSize 2, moving halves the target radius. Current
controllers use dotSize 1. Node reproduction.

### R17 — Low: PNG string helper truncates embedded NULs

`javascript/string_to_png.js:42`

Zero is a terminator; `a\0b` round-trips as `a`. JSON escapes NUL, so normal
saved JSON avoids this. The decoder also assigns undeclared charCode, leaking
a global and preventing strict-mode use. NUL truncation is browser-tested;
Unicode without NUL has a passing round-trip test.

### R18 — Low: optional ToggleButton callback is not callable

`javascript/toggle.js:4`, `javascript/toggle.js:87`

The callback defaults to null and change invokes it unconditionally. A
standalone toggle throws. Game immediately registers onClick, so its switch
works. Browser reproduction uses a standalone instance.

### R21 — Low: import/save doubles the filename suffix

`javascript/editor.js:403`, `javascript/editor.js:343`

Import populates the filename field with file.name, including .json. Save
unconditionally appends .json, producing fixture.json.json unless the user
edits the field. Browser test covers field population; suffix addition is
confirmed in source.

## Additional observations for later work

These are inspection/data findings, not reproduced end-to-end failures.

- **R22 — Medium, published data:** am_finaldance.json dot index 243 has
  x = -0.00032439265410605513, slightly outside the documented [0,1] range.
  All levels have finite coordinates, valid corners/colors, no duplicate
  corner-index triangles, no zero-area triangles and no unused dots in this
  audit. Coordinate bounds alone do not prove a puzzle is unplayable. Review
  player-progress consequences before changing published dots.
- **R23 — Medium, fetch/error UX:** URL loads and thumbnail fetches have no
  rejection handlers; nested response.text promises are not returned. Network
  and JSON errors can leave inert thumbnails with no visible retry/error.
  Save-code import reloads even if save() returns false. Copy Code assumes
  navigator.clipboard exists; its catch handles rejection, not an absent API.
- **R24 — Medium, lifecycle:** clear/load/resize/Back do not cancel every hint,
  zoom and celebration timer. zoomOut animations can overlap; hiding a finished
  game leaves its flashing interval running. Stale timers can update a newly
  loaded view/shadow. Constructors install global listeners without teardown
  (current pages create one instance). No touchcancel/blur cleanup is provided.
- **R25 — Low/medium, accessibility/mobile:** thumbnail buttons have no names
  and fetched titles are unused. Controls lack consistent associated labels;
  graph navigation is pointer-only. No page has a viewport meta tag. Fixed-width
  title/picker and overflow-hidden layouts need real-phone checks; existing
  editor touch-slider/layout limitations remain in todo.md.
- **R26 — Low, consistency/cleanup:** zoom/opacity changes lack consistent undo
  state; undoing image changes resamples colors rather than restoring them.
  clear retains thumbnail/background/zoom metadata. Version is read but unused;
  missing colors fall back to a string while Tri expects RGB objects. HSL
  setters reject null but accept undefined/non-numeric components. Graph mixes
  model, drawing and serialization; editor mixes controls, history and image
  sampling. Prefer focused cleanup after fixes rather than a broad rewrite.
- Existing malformed slider markup, unused files, unpublished backgrounds and
  hidden game file input remain in loose_ends.md.
- server.py uses a single-threaded TCPServer with a small backlog. Burst script
  loads intermittently produced connection refusals in browser testing. The
  fixture loads scripts sequentially; app/server behavior is unchanged.

## Original review validation

- 59 Node baseline tests pass, including all published and draft levels.
- All 20 strict Node known-bug reproductions fail as expected.
- Browser: 21 pass, 13 expected failures, zero unexpected failures/passes,
  using isolated Chromium frames with in-memory storage.
- Production JavaScript, HTML, CSS and levels are unchanged. _config.yml
  excludes test/development files from Jekyll. No public push was performed.
- Real phones, Safari/Firefox, native touch, clipboard/download UI, permission
  prompts and public deployment were not tested. See testing.md for details.
