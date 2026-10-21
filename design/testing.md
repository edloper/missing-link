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
  in each device/orientation, excluding explicitly named `@known` issues.
- `npm run test:mobile:known`: desired-behavior assertions for open R25 viewport
  layout behavior; can exit 1. Artifacts go in `test-results/known/` without
  replacing the passing suite's HTML report.
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
and edges, and synthetic drag/pinch cancellation. Compatibility tests also run
the existing DOM/SVG/canvas/editor tests in WebKit.

Windows WebKit's input coordinates require visual-viewport scaling on pages
that shrink a default 980px layout. The test tap helper maps DOM positions to
screen coordinates and uses `page.touchscreen.tap`; a check confirms that Hint
receives trusted native events. It does not inject a viewport tag or change the
page's CSS. Playwright's touchscreen API supports taps only, so drags and pinches
are explicitly labeled synthetic `TouchEvent` sequences. Page errors fail tests.

Reports, screenshots and failure traces stay in ignored `playwright-report/`
and `test-results/` directories. Jekyll excludes these directories, test sources,
config, dependencies and npm manifests. No runtime dependency/build step is added.

This was verified with Playwright 1.64.1 and its Windows WebKit 27.2 build.
All 28 functional project/test combinations pass (seven checks per profile),
including all 39 existing browser regressions in each profile. The 83 Node tests
still pass. The separate R25 desired-layout check fails on iPhone portrait
(390px device, 980px layout), iPhone landscape (750px, 980px) and iPad portrait
(810px, 980px); it passes on iPad landscape (1080px). It deliberately exits 1
while that issue remains open, rather than treating the shrunken layout as correct.

The WebKit build is not branded Safari; platform-dependent behavior can differ.
This Windows build reports navigator.maxTouchPoints as zero even in the touch
profiles, so these runs exercise the iPhone/iPad UA branch of tip detection,
not modern iPad Safari's desktop-UA/platform detection branch.
Resizing the viewport does not model Safari's collapsing toolbar, OS orientation
events, keyboard, safe-area hardware, true multi-finger input or storage eviction.
The Home Screen flag is injected for that one test, not an installed PWA.
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
