# TODO

Ideas and planned work. Move items to the relevant design doc when they are
done. Last checked against the code on 2026-10-20.

## Saved progress

- Optional automatic sync across devices. This needs a server (GitHub Pages
  only serves files); Cloudflare Workers with its built-in storage would fit,
  since the domain is already on Cloudflare. Players would get a sync code or
  a login.

## Editor

- Finish touch-screen support (low priority). Basic touch input already works
  (since Dec 2024): tapping adds and selects dots, and dragging and pinch-zoom
  go through the shared `MouseHandler`. Still missing: the Image Opacity and
  Image Zoom sliders are jQuery UI sliders, which ignore touch, and the layout
  is at least 500px wide (controls 730px), too wide for a phone. Not tried on
  a real touch device.
- Option to show triangle highlighting. `Tri` can draw a highlight outline,
  but the game and the editor both turn it off (since Dec 2024) and there is
  no setting for it.
- Make creating triangles easier. Currently you select three dots and all
  three are deselected once the triangle is made. Ideas: keep the last dot
  selected, or double-click to make a triangle from the nearest dots.
- A way to set a level's `padding` (currently only by editing the json).

## Levels

- More levels: a range of images (photos, drawings, and so on), some easy and
  some hard. Players currently see 6 levels; `bunny`, `xmastree`, `dog`,
  `fox` and `penguin` are drafts, commented out in `level_urls.js`.

## Code

- General cleanup. Maybe use option objects for constructor arguments, as
  `Graph` and `ToggleButton` already do (`Game`, `LevelEditor`, `Dot`, `Edge`
  and `Tri` take positional arguments).
