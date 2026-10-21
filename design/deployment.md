# Deployment

- https://www.the-missing-link.org/ is GitHub Pages serving the `main` branch
  of https://github.com/edloper/missing-link (root folder). Jekyll is on
  (`_config.yml`), and it skips files ending in `~` and the files listed under
  `exclude` (the agent notes, development README, `design/`, `tests/`, npm manifests and
  `node_modules/`). Test tooling does not change the static site's runtime.
- The `CNAME` file sets the custom domain. The bare domain and
  `edloper.github.io/missing-link/` redirect to `www.`.
- Cloudflare is only the registrar and DNS. The DNS records point straight at
  GitHub and are not proxied, so there is no Cloudflare cache.
- A push to `main` goes live in about a minute. There is no review step and no
  branch protection.
- GitHub serves files with `Cache-Control: max-age=600`, so browsers can show
  old files for up to 10 more minutes. A player can briefly get a new script
  with old level files, or the reverse.
- Everything committed is publicly downloadable from the site, so personal
  and third-party material stays out of git (see `.gitignore`).

## Local server

`python server.py [port]` serves the folder it is in, with caching turned off,
on port 8000 by default.
