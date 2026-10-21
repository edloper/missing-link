# Loose ends

Known issues and cleanup that hasn't been done yet. Remove items when they are
fixed.

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
