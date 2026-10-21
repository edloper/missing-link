# Loose ends

Known issues and cleanup that hasn't been done yet. Remove items when they are
fixed.

## Code review findings (2026-10-20)

See `code_review.md` for reproduction details and repair status. Remaining
reproduced issues:

- R2: dot touch handlers use mouse coordinates.
- R3: invalid saved data can prevent startup.
- R6: failed level import destroys the current graph.
- R4: locks are reconstructed incorrectly for sparse progress.
- R5: zoom clamps against the previous zoom level.
- R7: dot deletion is not one undoable editor action.
- R8: color sampling can produce invalid saved colors.
- R14: shortcuts conflict with browser/text editing.
- R15: graph transforms bypass and invalidate undo.
- R16: loaded background and color controls disagree.
- R19: image failure can leave thumbnail export pending.
- R20: JSON file import corrupts non-ASCII text.
- R9: one malformed cookie escape prevents migration.
- R10: overlap checking misses duplicate triangles.
- R11: degenerate triangles and endpoint proximity.
- R12: Graph's optional callbacks lose their receiver.
- R13: moving a scaled dot changes its hit target.
- R17: PNG string helper truncates embedded NULs.
- R18: optional ToggleButton callback is not callable.
- R21: import/save doubles the filename suffix.

Inspection/data follow-up remains: R22 published level coordinates; R23
load/storage error UX; R24 timer/listener/gesture cleanup; R25 accessibility
and mobile layout; R26 metadata/history consistency and code cleanup. The local
server also intermittently refuses bursts of script requests. See the review.

## Earlier findings

- `levels/bunny.json` and `levels/xmastree.json` were saved on Dec 23, 2024,
  shortly after a change that made the editor shrink levels slightly each time
  it saved (fixed in 2367baa). Their dots may sit a little inside the
  background image, which only matters when recoloring them in the editor.
- Unused files: `javascript/test1.js` (a long string constant, referenced
  nowhere) and `levels/pink_penguin.json` (not listed in `level_urls.js`).
  `levels/dog.json`, `fox.json`, `penguin.json`, `bunny.json` and
  `xmastree.json` are commented out in `level_urls.js`.
- `game.html` is an older version of `game_fullscreen.html` that nothing links
  to.
- In `EDITOR_CONTROLS_HTML` (`javascript/editor.js`), the Image Zoom slider
  handle's tag is missing its `>`:
  `<div id="editorBackgroundZoomHandle" class="ui-slider-handle"</div>`.
  Browsers usually recover from this, but it should be fixed.
- `#gameLoadFromFile` (a "Load Game" file input in the game controls) is always
  hidden by CSS.
- No background images are published, so the editor on the live site can't
  recolor triangles. To change that, add images the owner made or has a
  license for to `backgrounds/`.
- Not tested on a real phone since the October 2026 fixes: touch input, phone
  rotation, the Easy Mode switch, and the Home Screen tip.
