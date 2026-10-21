# Testing

Added on 2026-10-20 without changing application JavaScript, pages, CSS or levels.
The only deployment change excludes test/development files from Jekyll.

## Commands

- `npm test` (or `npm.cmd test` in Windows PowerShell): passing baseline.
- `npm run test:bugs`: known-bug reproductions as ordinary failing tests;
  currently expected to exit 1.
- `npm run test:known`: the same reproductions marked TODO, so existing failures
  do not fail the command. A future fix must promote its test to the baseline.
- `python server.py 8001`, then http://localhost:8001/tests/browser.html:
  browser integration tests, running automatically when opened.

Node 22+ is required. No installed packages or generated dependencies are needed.
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
- `known-bugs.cjs`: executable desired-behavior assertions for review IDs
  R1–R13. Separate from the passing baseline.
- `browser.html`, `browser-runner.js`, `browser-fixture.html`,
  `browser-tests.js`: real constructors, DOM/SVG mouse events, buttons,
  checkbox, picker fetch/save/reset/save-code dialog, editor subdivision and
  undo, image fallback, file import, PNG encoding, thumbnail conversion,
  canvas color sampling, color sliders and Home Screen tip. Existing browser
  failures are tagged with review IDs.

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
59 passing Node baseline tests, 20 strict Node reproductions failing as expected,
21 passing browser tests, 13 expected browser failures, no unexpected failures
or passes. Known-bug tests are executed, not skipped.

Not verified on Firefox, Safari, a real phone or iPad, or with native touch
gestures. Synthetic events do not establish OS/browser gesture behavior,
passive listener semantics or accessibility. Browser clipboard permissions,
actual file-download UX, persistent-storage prompts and deployment behavior
also need manual checks. No coverage-percentage claim is made.

## Extending the suite

Keep app scripts as script-tag globals; tests must not require a production
module/build conversion. Add fixtures for behavior, rather than source-text
snapshots. For a bug fix, move the corresponding desired-behavior assertion
into a normal test and remove its expected-failure marker. Update the review
and loose ends in the same commit as each eventual fix.
