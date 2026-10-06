# Deploying this portfolio — pfarell.github.io (free)

**Live host: GitHub Pages → `https://pfarell.github.io`**
- Hosting: **$0** · SSL: **$0** · No card, no subscription, no `.vercel.app` / `.netlify.app` URL.
- The repo must be named exactly **`pfarell.github.io`** and live under the **pfarell** account
  (user-site repos publish at that address).

## One-time deploy (done for you if `gh` is logged in as pfarell)

```powershell
gh auth login                                   # sign in as the pfarell GitHub account
git init -b main; git add .; git commit -m "Portfolio: pfarell.github.io"
gh repo create pfarell/pfarell.github.io --public --source . --push
gh api -X POST repos/pfarell/pfarell.github.io/pages --input pages-source.json
```

where `pages-source.json` is:

```json
{ "source": { "branch": "main", "path": "/" } }
```

First build takes 1–3 minutes. The site is live at `https://pfarell.github.io/`
(with `/projects/` and `/about/`).

## Updating the site later

```powershell
gh auth switch --user pfarell      # if your active gh account is a different one
git add -A; git commit -m "Update"; git push
```

Pages redeploys automatically from `main`.

## Checklist after deploy

- [ ] `https://pfarell.github.io/` loads over HTTPS with a padlock
- [ ] `/projects/` and `/about/` work (clean URLs, no `.html`)
- [ ] The old links `projects.html` / `about.html` redirect
- [ ] Dark mode + Wanderly assistant work on the live site
- [ ] Share the link once in a chat → the OG card renders

## Optional later: pfarell.dev

`pfarell.dev` is **not free** (~$12/yr at Cloudflare/Porkbun) and currently has no DNS. If you buy it:

1. Repo → Settings → Pages → Custom domain → `pfarell.dev` (GitHub writes a CNAME file).
2. At the registrar: `A` records for `@` → 185.199.108.153 / .109.153 / .110.153 / .111.153,
   `CNAME` for `www` → `pfarell.github.io`.
3. Tick "Enforce HTTPS" (free certificate, issued automatically).
4. Then swap the canonical/OG URLs from `https://pfarell.github.io` to `https://pfarell.dev`
   (3 HTML files + `sitemap.xml` + `robots.txt`).

`vercel.json` is kept in the repo so the same folder can also deploy to Vercel
(clean URLs + cache headers) if you ever want a second host — it is not used by GitHub Pages.
