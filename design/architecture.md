# Architecture

Missing Link is a static browser puzzle game: plain JavaScript, with jQuery,
jQuery UI and svg.js loaded from CDNs, and no build step. Players connect dots
to reveal a picture made of triangles. A desktop level editor makes the levels.

The dependency-free Node suite and browser integration runner are described in
`testing.md`. `code_review.md` records the 2026-10-20 review and executable
regressions and repair status. Published levels and progress keys are unchanged.

## Pages

- `index.html`: title page, linking to the game and the editor.
- `game_fullscreen.html`: the game.
- `game.html`: an older, non-fullscreen version of the game. It still works
  but nothing links to it.
- `editor.html`: the level editor (desktop only).

## Scripts (`javascript/`)

- `graph.js`: the model and SVG drawing (`Graph`, `Dot`, `Edge`, `Tri`), and
  loading and saving level json.
- `shapes.js`: geometry helpers, such as line intersection.
- `game.js`: gameplay: drawing edges, hints, undo, Easy Mode, and reporting
  progress.
- `level_picker.js`: the level grid, locking, saved progress, save codes, and
  the Home Screen tip.
- `level_urls.js`: the list of levels in play order. Commented-out entries are
  hidden from players.
- `mouse_handler.js`: mouse and touch input, drag, pinch and wheel zoom, for
  both the game and the editor.
- `editor.js`: the level editor, including `ColorLookupCanvas`, which samples
  triangle colors from a background image.
- Smaller helpers: `toggle.js` (the Easy Mode switch), `colorpicker.js`,
  `confetti.js`, `splashscreen.js`, `svg_to_png.js`, `string_to_png.js`,
  `color.js`.

## Level files (`levels/*.json`)

- `version`: 2.
- `dots`: `{x, y}`, each from 0 to 1.
- `tris`: `{color: {red, green, blue}, corners: [three dot indices]}`.
- `extras`: `title`, `backgroundColor` (HSL), `thumbnail` (a PNG data URL,
  shown in the level picker once the level is finished), `imageFilename` and
  `imageZoom` (the editor's background image).
- `padding` (optional, top level): pixels of space around the level in the
  game; 20 if missing. The editor lays levels out with no padding, so dots
  line up with the background image, and keeps a level's `padding` value when
  it saves.

`Graph.levelTransform()` maps level coordinates to the canvas; loading,
saving and `Game.resize()` all use it.

## Background images

- The editor colors each triangle from the background image under it.
  `imageFilename` is a bare filename. The editor looks for it in
  `backgrounds/`, then in `backgrounds/personal/`.
- `backgrounds/personal/` is gitignored, so it is not published. It holds
  family photos, and web clipart that is watermarked or may be copyrighted.
  Only images the owner made or has a license for belong in `backgrounds/`
  itself (currently there are none).
- When no image is available (as on the live site), the editor keeps each
  triangle's saved color.

## Saved progress

- Stored in `localStorage` under `MissingLink_progress`:
  `{levels: {<level url>: {progress: {finished, percentDone, edges},
  locked, index}}}`.
- `edges` lists the player's edges as pairs of dot indices. When loading,
  edges that don't fit the level (for example, after the level's dots were
  edited) are skipped.
- Progress is keyed by level URL, and a level unlocks when the one before it
  in `level_urls.js` is finished. So renaming, reordering or editing a
  published level affects players' progress.
- Older versions kept progress in one cookie per level. Those cookies are
  moved to `localStorage` on first load and then deleted.
- Once a level is finished, the game asks the browser for persistent storage
  (`navigator.storage.persist()`).
- Save codes (the Save Code button on the level picker) let players back up or
  move progress. A code is `ML1-` followed by the progress json,
  deflate-compressed and base64-encoded (`ML0-` means not compressed, for
  browsers without `CompressionStream`).
- Safari deletes a site's data after 7 days without a visit, except for sites
  opened from the Home Screen, which have their own separate storage. On
  iPhone and iPad, the level picker shows a dismissible tip about this; the
  hidden state is stored under `MissingLink_hideHomeScreenTip`.

## Reviewed bug fixes

- R1: Hint and Undo cancel any unfinished drag before inspecting connected edges.
- R2: Game dots and editor dots/triangles route touch events through the touch coordinate and pinch handlers.
- R3: Save codes validate nested progress; startup drops invalid records while retaining valid records, and edge restoration skips malformed pairs.
- R4: Progress defaults are populated before reconstructing locks, so missing predecessors stay unfinished and finished predecessors unlock new successor records.
- R5: Zoom clamps offsets using the new magnification, keeping the cursor anchored and the viewport within the canvas.
