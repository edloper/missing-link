# Missing Link

A static browser puzzle game and level editor. Run locally with:

```sh
python server.py 8001
```

Open http://localhost:8001/.

## Tests

Requires Node.js 22 or later; no npm install or build step is needed.

```sh
npm test
```

In Windows PowerShell, use `npm.cmd test` if execution policy blocks `npm.ps1`.
The baseline suite covers geometry, graph serialization, gameplay, input logic,
progress storage and all level files. It does not change application sources.

With the local server running, open http://localhost:8001/tests/browser.html
for automatic browser integration tests. They use the same CDN libraries as
the app and replace storage with memory inside isolated frames, preserving your
saved progress. All reviewed reproductions now pass; a successful run has zero
FAILs, XFAILs and XPASSes. Results are available in `window.testResults`.

```sh
npm run test:bugs
```

This command runs the original Node bug reproductions, now ordinary passing
regression tests. `npm run test:known` is an alias for the same focused suite.
The browser page includes the remaining editor and browser utility regressions.

See [the review](design/code_review.md) for findings and
[testing details](design/testing.md) for scope and limitations.
