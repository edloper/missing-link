# Loose ends

Known issues and cleanup that hasn't been done yet. Remove items when they are
fixed.

## Code review findings (2026-10-20)

See `code_review.md` for locations, impact and reproduction details, and
`testing.md` for the new test suite. Runtime fixes are intentionally deferred.

- High priority: R2 touch handlers use mouse coordinates; R3 invalid save data
  can break startup; R6 failed level imports clear the current working graph.
- Gameplay/input: R1 Hint/Undo on an active edge throws; R4 sparse progress
  reconstructs locks incorrectly; R5 zoom uses old bounds; R14 keyboard
  shortcuts conflict with browser/text editing.
- Editor: R7 dot deletion needs multiple undos; R8 out-of-range sampling can
  create invalid colors; R15 transforms bypass/invalidate undo; R16 loaded
  color picker is stale; R19 failed thumbnail decoding leaves export pending;
  R20 UTF-8 JSON import corrupts titles; R21 filename suffix is doubled.
- Helper edge cases: R9 malformed cookie decoding; R10 duplicate/contained
  triangle overlap; R11 degenerate geometry/proximity; R12 optional Graph
  callbacks; R13 scaled dot hit targets; R17 embedded NUL PNG strings;
  R18 ToggleButton without a callback.
- Inspection/data follow-up: R22 slightly negative x for published
  am_finaldance dot 243; R23 load/storage error UX; R24 timer/listener/gesture
  cleanup; R25 accessibility/mobile layout; R26 metadata/history consistency
  and separation of responsibilities. The local server also intermittently
  refuses bursts of script requests; tests load scripts sequentially.

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
