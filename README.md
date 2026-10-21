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
saved progress. A successful run has zero FAILs and zero XPASSes; XFAILs are
documented existing bugs. Results are also available in `window.testResults`.

```sh
npm run test:bugs
```

This separate command asserts the desired behavior for known bugs and currently
exits **1**. `npm run test:known` executes those same reproductions as Node TODOs
and exits successfully. When fixing a bug, promote its reproductions to normal
tests and remove the browser XFAIL marker.

See [the review](design/code_review.md) for findings and
[testing details](design/testing.md) for scope and limitations.
