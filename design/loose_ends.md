# Loose ends

Known issues and cleanup that hasn't been done yet. Remove items when they are
fixed.

## Code review findings (2026-10-20)

See `code_review.md` for completed repairs. Open inspection/data findings:
R22 published level coordinates; R23
load/storage error UX; R24 timer/listener/gesture cleanup; R25 accessibility
(its mobile layout part was fixed on 2026-11-25); R26 metadata/history consistency and code cleanup. The local
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
  rotation, and the Easy Mode switch.
- The 2026-11-25 iPhone/iPad changes (see "Phones and tablets" in
  `architecture.md`) were checked only in Playwright's WebKit with iPhone and
  iPad profiles. To check on a real iPhone and iPad:
  - In Safari: the level picker, buttons and the Home Screen tip are at normal
    size; the tip's wording and icons match what Share shows on that iOS
    version; "Not now" and "Don't show again" work; the board's dots look as
    before, and dragging, panning and pinching still work.
  - The level picker scrolls (in landscape, to reach the tip) although the
    page itself doesn't, and a double tap doesn't zoom the page.
  - The save code dialog: tapping a code field doesn't zoom the page, the code
    can still be selected and copied, and the page is back in place after the
    keyboard closes.
  - Delete the old Home Screen icon (save a code first: this deletes its
    progress) and add the game again from `index.html`: it should open the
    game, with the new icon, and no blur at the top of the level picker or of
    a level (the status bar takes the screen's color). Rotate on both screens.
  - On a phone with a notch, in landscape: the back button, Undo, Hint and
    Easy Mode stay clear of the notch and home bar.
- The 2026-11-23 fix for taps missing after rotating an iPhone Home Screen app
  (`javascript/viewport.js`, see `architecture.md`) is untested on a real
  device; the automated check only fakes the shift. To confirm: add the game
  to an iPhone's Home Screen, open a level, turn the phone portrait ->
  landscape -> portrait, and check that the buttons (Back, Hint, Undo, Easy
  Mode, and the level picker's buttons and thumbnails) still answer taps.
