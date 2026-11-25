# Architecture

Missing Link is a static browser puzzle game: plain JavaScript, with jQuery,
jQuery UI and svg.js loaded from CDNs, and no build step. Players connect dots
to reveal a picture made of triangles. A desktop level editor makes the levels.

The dependency-free Node suite, browser integration runner and optional
Playwright/WebKit mobile checks are described in
`testing.md`. `code_review.md` records the 2026-10-20 review and executable
regressions and repair status. Published levels and progress keys are unchanged.

## Pages

- `index.html`: title page, linking to the game and the editor.
- `game_fullscreen.html`: the game (see "Phones and tablets" below).
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
- `viewport.js`: `keepPageInPlace()` and `setScreenColor()`, used only by
  `game_fullscreen.html` (see "Phones and tablets" and "Rotating an iPhone
  Home Screen app" below).
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

Imports validate JSON structure, references, colors and metadata before clearing
existing work. File inputs read UTF-8 text. PNG string exports use a magic pixel
and explicit length to preserve empty strings and NUL characters; the decoder
also accepts older zero-terminated PNG strings.

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
- Save codes validate nested progress records before accepting an import.
  Startup ignores invalid stored records while retaining valid ones; defaults
  are added before reconstructing unlocks for missing records.
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
  opened from the Home Screen, which have their own separate storage. See
  "The Home Screen tip" below.

## Phones and tablets

`game_fullscreen.html` and `index.html` have a `width=device-width` viewport
tag (added 2026-11-25; before that, iPhones laid the game out 980px wide and
shrank it to about 40%, so buttons and text were tiny: review item R25).

- The board keeps the look the levels were made for. `Game.setSize()` draws
  the svg in board units: its width/height attributes and viewBox are the
  screen size divided by `scale`, and its CSS size is the screen size.
  `game_fullscreen.html` passes `scale = min(1, innerWidth / 980)`
  (`BOARD_WIDTH`), so on a phone the dots, numbers and lines are the same size
  on screen as before the viewport tag, while the buttons and title are at
  normal size. `game.width`/`game.height` are in board units; the mouse
  handler converts screen pixels with `unitsPerPixel()` (panning, drag
  threshold). Desktop windows 980px or wider use scale 1, as before; narrower
  desktop windows now shrink the board too. The editor doesn't use this.
- The page never scrolls (`body {overflow: hidden; touch-action: none}`); the
  level picker is a full-screen box that scrolls inside itself
  (`touch-action: pan-y`). `LevelPicker.fitGrid()` shrinks the grid of levels
  with CSS `zoom` so that it fits across the screen and, down to half size,
  so that the title, grid and buttons fit without scrolling.
- Buttons and the back button stay clear of the notch and home bar
  (`env(safe-area-inset-*)`, with `viewport-fit=cover`). On touch screens the
  picker's buttons are 44px tall, and the save code fields use 16px text so
  iOS doesn't zoom in on them (`style.css`, `pointer: coarse`). Text outside
  the save code fields can't be selected, and long presses don't open the
  callout menu.
- Installing: `manifest.webmanifest` (scope `/`, `start_url`
  `/game_fullscreen.html`, so the app opens the game even when added from the
  title page) and the Apple meta tags. The icons (`images/icon-*.png`) are made
  from `images/icon.svg` (a redrawing of `icon_blue.png`) by
  `scripts/make_icons.cjs`. An installed Home Screen icon keeps the icon,
  start page and status bar style it was added with: to see changes, delete it
  and add it again (which deletes its progress: save a code first).
- The status bar style is `default`, not `black-translucent`: on iOS 26 a
  translucent bar blurs the page under it. Even so, iOS 26 blurs the top of a
  Home Screen app unless an opaque `position: fixed` box covers the top edge,
  and colors the status bar from it. So in a Home Screen app
  (`html.standalone`), `#topEdge` is a 12px fixed strip at the top, in the
  color of the current screen: white for the level picker, the level's
  background in a level. `setScreenColor()` sets it (with the html background
  and `theme-color`); `LevelPicker.show()`/`hide()` call it. It sits under
  jQuery UI's dialog backdrop so it dims with the page.
- No service worker, sound, printing or downloads in the game, so those iOS
  issues don't apply. Progress asks for persistent storage after the first
  finished level (see "Saved progress").

## The Home Screen tip

On an iPhone or iPad in a browser tab (`navigator.standalone === false`), the
level picker shows a tip under its buttons (`addHomeScreenTip()`): why (the
browser may clear saved progress), how (Share, Add to Home Screen, maybe under
View More, with iOS's icons drawn inline, copied from Origami Blast), and that
the Home Screen game has its own progress, with how to bring it across with a
save code (or "Switch before you start" with no progress yet). "Not now" hides
it for 20 hours, "Don't show again" for good; `MissingLink_hideHomeScreenTip`
holds `never` (or `1` from the older tip's close button) or the time of "Not
now". The owner chose a tip under the buttons rather than a popup, and this
wording (2026-11-25).

## Rotating an iPhone Home Screen app

On an iPhone (seen on iOS 26 and 27), in a web app added to the Home Screen,
turning the phone to landscape and back can leave the page shifted up by the
status bar's height (59px on a Dynamic Island iPhone): the root and body boxes
sit above 0 and `visualViewport.offsetTop` is 59, while `scrollY` may still be
0. The page still paints in place, but taps are hit-tested against the shifted
page and land about 59px low, so buttons stop answering. The same bug was
fixed in another of the owner's games (Origami Blast) and in
github.com/victronenergy/gui-v2/pull/3280.

`game_fullscreen.html` never scrolls on purpose (`body {overflow: hidden;
touch-action: none}`), so it calls `keepPageInPlace()` (`viewport.js`) once at
startup. On `resize`, `orientationchange`, `screen.orientation` `change`,
`visualViewport` `resize` and `scroll`, and the page becoming visible again, it
checks at once, on the next frame, and after 150, 400 and 800ms. If the page is
scrolled or its root/body box is above or left of 0 (or the visual viewport is
offset at scale 1), it scrolls everything back to 0,0. It leaves the page alone
while an on-screen keyboard is up or a text field has focus (the save code
dialog). Don't add it to a page that scrolls, such as `index.html` or the
editor: it would jump the player back to the top.

## Reviewed bug fixes

- R1: Hint and Undo cancel any unfinished drag before inspecting connected edges.
- R2: Game dots and editor dots/triangles route touch events through the touch coordinate and pinch handlers.
- R3: Save codes validate nested progress; startup drops invalid records while retaining valid records, and edge restoration skips malformed pairs.
- R4: Progress defaults are populated before reconstructing locks, so missing predecessors stay unfinished and finished predecessors unlock new successor records.
- R5: Zoom clamps offsets using the new magnification, keeping the cursor anchored and the viewport within the canvas.
- R6: Level JSON, references, colors and metadata are validated before clearing a game/editor graph; invalid imports preserve work and history.
- R7: Dot deletion records its dependent triangles in one undo event, restoring the complete deletion with a single Undo.
- R8: Triangle sampling clamps pixel coordinates to the canvas bounds, including right/bottom edges, preventing invalid saved colors.
- R9: Cookie migration decodes only matching progress values and isolates malformed values instead of decoding all site cookies.
- R10: Overlap warnings use separating axes to detect duplicate/contained triangles while allowing shared edges and corners.
- R11: Point inclusion rejects zero-area triangles; sampling them uses neutral gray. Circle proximity uses the nearest point on the finite segment, including endpoints and zero-length segments.
- R12: Graph.loadFromJson calls its own addDot/addTri methods with the graph receiver when custom callbacks are omitted.
- R13: Moving/resizing a dot retains its configured hit target radius multiplied by dotSize.
- R14: Handled game shortcuts prevent browser defaults; game/editor shortcuts leave input, textarea, select and editable text targets alone.
- R15: Each graph scale/translation records original and destination coordinates so Undo restores the transform and preserves earlier undo actions.
- R16: Level loads and background-color undo synchronize all picker sliders without generating extra history or recursive change callbacks.
- R17: PNG string encoding uses a marker and explicit length to preserve empty strings and NULs; decoding still accepts legacy zero-terminated PNGs without leaking globals.
- R18: A ToggleButton without a registered callback uses a no-op callback and remains interactive.
- R19: Thumbnail decode/canvas errors reject; editor export always restores prior dot visibility and image opacity, and Save reports failures.
- R20: Game/editor JSON file inputs read UTF-8 text directly instead of passing base64 byte strings to JSON.parse.
- R21: Imported filenames omit JSON suffixes in the name field, and downloads always use exactly one .json extension.
