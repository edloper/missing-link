# Instructions for agents working on Missing Link

Missing Link is a static browser puzzle game with a level editor. Start by
reading the design docs in `design/`:

- `design/architecture.md`: pages, scripts, the level file format, background
  images, and how saved progress works.
- `design/deployment.md`: how the site is published and cached.
- `design/loose_ends.md`: known issues and cleanup not done yet.
- `design/todo.md`: ideas and planned work.

## Keep the design docs up to date

Whenever you change anything, update the design docs in the same commit:
describe new or changed behavior in the relevant doc, add anything you notice
but don't fix to `loose_ends.md`, and remove items from `loose_ends.md` and
`todo.md` once they are done.

## Publishing

- A push to `main` is a public deploy: the site updates about a minute later,
  with no review step. Confirm with the owner before pushing.
- Everything committed is publicly downloadable from the site. Never commit
  personal photos, or images that are watermarked or may be copyrighted: they
  go in `backgrounds/personal/`, which is gitignored. Ask before committing
  anything else personal.
- Files only for agents and developers (like these notes and `design/`) must
  stay in the `exclude` list in `_config.yml`, so they aren't published as
  pages.

## Changing levels

Players' saved progress refers to levels by URL and to dots by index, and
levels unlock in `javascript/level_urls.js` order. Before editing a published
level's dots, or renaming or reordering levels, tell the owner how it affects
players' progress.

## Code style

- Plain JavaScript loaded with `<script>` tags; no build step or modules.
- Match the existing Emacs-style indentation: 4-space steps, with a tab for
  every 8 columns.
- Make one commit per fix or feature.

## Testing

- Run `python server.py 8001` and open http://localhost:8001/. Port 8000 may
  already be in use on the owner's machine.
- `node --check javascript/<file>.js` catches syntax errors.
- Check changes in a browser. `game` and `editor` are globals on their pages
  (the level picker is not): `$('.thumbnail').eq(i).click()` opens level i,
  `game.hint()` adds one correct edge, and `editor.loadFromJson(text)` /
  `editor.saveToJson()` load and save a level.
- In T3 Code's preview, background tabs (`open: false`) didn't respond to
  clicks or snapshots, and tabs became unresponsive after many reloads. Use
  `preview_evaluate` with jQuery or `dispatchEvent`, and open a fresh tab if
  one stops responding.
- Say what you couldn't test, for example on a real phone.
