# Testing

Added on 2026-10-20, then extended as the 21 reproduced review issues were fixed
in separate commits. Published levels and progress keys are unchanged.

## Commands

- `npm test` (or `npm.cmd test` in Windows PowerShell): passing baseline.
- `npm run test:bugs`: the original Node reproductions, now passing regressions.
- `npm run test:known`: compatibility alias for the same focused regression suite.
- `python server.py 8001`, then http://localhost:8001/tests/browser.html:
  browser integration tests, running automatically when opened.

Node 22+ is required. The Node baseline needs no installed packages.
Node's built-in test runner executes `tests/*.test.cjs`. The browser runner uses
the app's existing jQuery, jQuery UI and SVG.js CDN URLs; internet is required
for that suite. It loads scripts sequentially because the single-threaded local
server sometimes refuses speculative bursts of requests on Windows.

## Scope

- `geometry.test.cjs`: point inclusion, sampling, edge crossings, triangle
  overlap, circle/segment proximity and HSV conversion.
- `graph-game.test.cjs`: transforms and padding, repeated JSON round trips,
  graph cleanup, neighbor counts, reveal/hide rules, shared edges, progress,
  hints, undo, Easy Mode, drag validation and resize.
- `input.test.cjs`: click routing, drag thresholds, screen/graph coordinate
  conversion, pan/zoom bounds, pinch state transitions and canvas touch taps.
- `progress.test.cjs`: compressed/uncompressed Unicode save codes, malformed
  codes, default locks, localStorage precedence, cookie migration, storage
  failures and persistence requests.
- `levels.test.cjs`: all 12 JSON levels, including drafts; corner references,
  colors, round trips, unique required edges and completion via hints. These
  checks establish graph consistency; they do not prove that every puzzle can
  be solved through the stricter manual drag path. Normalized bounds and other
  data issues are recorded in the review instead of changing published dots.
- `review-regressions.test.cjs`: the original Node reproductions for R1–R13,
  promoted to ordinary passing tests, plus zero-area color sampling coverage.
- `browser.html`, `browser-runner.js`, `browser-fixture.html`,
  `browser-tests.js`: real constructors, DOM/SVG mouse events, buttons,
  checkbox, picker fetch/save/reset/save-code dialog, editor subdivision and
  undo, image fallback, file import, PNG encoding, thumbnail conversion,
  canvas color sampling, color sliders and Home Screen tip. Existing browser
  regressions are tagged with review IDs; none retain expected-failure markers.

The Node helper evaluates unmodified script-tag sources in fresh VM contexts.
It substitutes a small recording SVG drawing surface, in-memory storage and
timers, then exercises the real model and game methods. Most game fixtures
bypass the DOM constructor; browser tests cover actual constructor wiring.
Animations are not simulated in Node. Browser completion decoration is disabled
to keep model/control tests focused; animation appearance is outside the suite.

The browser runner uses a separate iframe for each of the game, editor and
utility groups. Its fixtures replace localStorage and cookie access before app
code loads. They neither import nor overwrite actual player progress. It uses
synthetic mouse/touch events, with no browser automation package dependency.
Fixture setup failures always fail; uncaught errors/rejections observed during
a test are included in its result. A timeout fails a group. `window.testResults`
contains `done`, `passed`, `failed`, `expectedFailures`, `unexpectedPasses` and
the individual results. XFAIL is a desired assertion currently failing; XPASS
means the known-issue marker needs review and makes the page fail.

## Verification and limits

Verified with Node 24.19.0 and the T3 Code Chromium preview on Windows:
83 passing Node tests and 39 passing browser tests. All 20 original Node and
13 original browser reproductions pass, with no TODOs or expected failures.
Compatibility includes every published/draft level, sparse progress records,
UTF-8 JSON imports and legacy zero-terminated PNG strings.

Not verified on Firefox, Safari, a real phone or iPad, or with native touch
gestures. Synthetic events do not establish OS/browser gesture behavior,
passive listener semantics or accessibility. Browser clipboard permissions,
actual file-download UX, persistent-storage prompts and deployment behavior
also need manual checks. No coverage-percentage claim is made.

## Automated iPhone/iPad checks

The optional Playwright suite adds a pinned development dependency and lockfile.
It leaves production pages/scripts, level data and player storage formats alone.
Setup (Windows PowerShell may require `npm.cmd` / `npx.cmd`):

```sh
npm ci
npx playwright install webkit
npm run test:mobile
```

The browser download is stored in Playwright's per-user cache, outside the repo.
On this Windows machine installation needed no administrator approval and
downloaded WebKit and its FFmpeg helper. The website requires neither package.
On Linux, Playwright may also need its documented system dependencies.

`playwright.config.cjs` selects four WebKit projects: iPhone 13 and iPad (gen 7),
each in portrait and landscape. Profiles set the user agent, screen/viewport,
device pixel ratio, mobile layout behavior and touch capability. These are
device profiles, not emulations of the particular iOS versions in the UA.
Every test gets fresh browser context/storage, separate from the owner's browser.
The runner starts `python server.py 8001` if needed and otherwise reuses the
local server. One worker avoids overwhelming its small connection backlog.

- `npm run test:mobile`: functional mobile checks and all 39 browser regressions
  in each device/orientation.
- `npm run test:mobile -- --project=iphone-portrait`: run one device profile.
- `npm run test:mobile:headed -- --project=ipad-portrait`: watch automated checks.
- `npm run test:mobile:report`: inspect the latest full-suite HTML report.
- With `python server.py 8001` already running, `npm run mobile:iphone` or
  `npm run mobile:ipad` opens an interactive device-sized WebKit window. These
  commands are for visual/manual checks; they do not reproduce physical fingers.

The new checks exercise the actual fullscreen page: locked thumbnails, native
tap events for Hint/Undo/Easy Mode/Back, partial progress across reload, save-code
export/import through its dialog and confirmation, tip dismissal persistence,
simulated Home Screen detection, viewport rotation preserving normalized dots
and edges, a page shifted during a rotation being put back (`viewport.js`),
synthetic drag/pinch cancellation, the page fitting each screen at its device
width (picker grid, 44px buttons, tip text, board size), and the Home Screen
app's top strip taking each screen's color. Compatibility tests also run
the existing DOM/SVG/canvas/editor tests in WebKit.

The test tap helper maps DOM positions to screen coordinates (allowing for
visual-viewport scaling, which pages without a viewport tag needed) and uses
`page.touchscreen.tap`; a check confirms that Hint receives trusted native
events. Playwright's touchscreen API supports taps only, so drags and pinches
are explicitly labeled synthetic `TouchEvent` sequences. Page errors fail tests.

Reports, screenshots and failure traces stay in ignored `playwright-report/`
and `test-results/` directories. Jekyll excludes these directories, test sources,
config, dependencies and npm manifests. No runtime dependency/build step is added.

This was verified with Playwright 1.64.1 and its Windows WebKit 27.2 build.
On 2026-11-25 (after the viewport fix) all 40 project/test combinations pass
(ten checks per profile), including all 39 browser regressions in each
profile, and the 84 Node tests pass.

The WebKit build is not branded Safari; platform-dependent behavior can differ.
The iOS bug where a rotation leaves the page shifted (see `architecture.md`)
can't happen in desktop WebKit, which hit-tests correctly. Its check fakes the
shift: it scrolls a temporarily taller page by 59px, rotates and rotates back,
and checks that the scroll and root box are back at 0 and each visible
button's centre hits that button. WebKit reports that scroll as a
`visualViewport` scroll, which `viewport.js` undoes at once, so an init script
holds those events back until the rotation. With the fix disabled the check
fails (scrollY stays about 59). Its button check passes either way here,
because desktop WebKit paints and hit-tests the same shifted page.
Playwright's WebKit has no `navigator.standalone`, which the tip uses to
detect an iOS browser tab, so the tests set it with an init script (false for a
tab, true for a Home Screen app).
Resizing the viewport does not model Safari's collapsing toolbar, OS orientation
events, keyboard, safe-area hardware, true multi-finger input or storage eviction.
The Home Screen flag is injected, not an installed PWA.
Those behaviors still need Apple Simulator or real-device testing. See the
[Playwright emulation docs](https://playwright.dev/docs/emulation),
[touch limitations](https://playwright.dev/docs/api/class-touchscreen) and
[WebKit platform notes](https://playwright.dev/docs/browsers#webkit).

## Extending the suite

Keep app scripts as script-tag globals; tests must not require a production
module/build conversion. Add fixtures for behavior, rather than source-text
snapshots. For a bug fix, move the corresponding desired-behavior assertion
into a normal test and remove its expected-failure marker. Update the review
and loose ends in the same commit as each eventual fix.
