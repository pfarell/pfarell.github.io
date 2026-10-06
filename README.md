# Praditya Farell — portfolio

**Live: https://pfarell.github.io/** (GitHub Pages, $0 hosting + SSL, no `.vercel.app`/`.netlify.app`).

A three-page personal portfolio, built from scratch as plain HTML/CSS/JS
(no frameworks, no build step, no external services at runtime). The layout and
design system are recreated from the reference site `serenacrq.com`, measured
directly from its live CSS and screenshots, then personalised.

## Pages

| File | Contents |
|---|---|
| `index.html` | Hero with the interactive pixel-art portrait, philosophy card stack, featured projects, Let's Connect / footer |
| `projects/index.html` | "Things I've Made" — OpenVoice and Ripple cards with real app screenshots |
| `about/index.html` | Polaroid strip, bio, What I do, draggable Stack, Education, Inspiration quote |

Old flat links (`projects.html`, `about.html`) still exist as redirect stubs.

## Run it

```powershell
# from this folder
python -m http.server 4173
# then open http://127.0.0.1:4173/
```

Or just double-click `index.html` — everything is local (fonts, images, scripts).

## The portrait interaction

- The hero card shows a **pixel-art version** of the photo (canvas, nearest-neighbour).
- **Moving the mouse anywhere on the page** tilts/parallaxes the portrait toward the cursor.
- **Hovering the card** starts a small, cursor-tracked **spotlight** (~30% of the card) that
  un-pixelates **only the part under the cursor** — pointer on the shoulder reveals the shoulder,
  pointer on the face reveals the face detail — everything else stays pixelated. The spotlight
  fades as the pointer leaves. All motion is frame-rate independent and reduced-motion aware.

## Wanderly — the assistant (bottom-right)

Click the chat bubble to talk to **Wanderly**, a **fully offline assistant** about Farell —
no API keys, no network calls. It is a hand-written knowledge base of **121 intents** plus a
matching engine (`js/assistant.js`): normalize → plural-fold/synonyms → fuzzy spell-fix
(Levenshtein, so "edution" works) → phrase/topic scoring → tiered fallback (questions about
unknown tech still get an honest, useful answer instead of a shrug).

Coverage: identity, projects in depth (OpenVoice & Ripple mechanics, benchmarks, licenses),
skills/tech (with honest "not public" answers), contact, philosophy, this site and its design,
page navigation ("take me to projects") and meta/fun questions. Replies stream word-by-word
with typing dots; link buttons and page buttons are rendered inside answers.

## Dark mode

The moon/sun button at the right of the nav pill switches themes. The choice is stored in
`localStorage` (`theme-preference`) and the first visit follows the system setting. The sky
imagery is dimmed for the dark palette.

## Regenerating assets

| Command | What it does |
|---|---|
| `C:\Users\radit\ComfyUI\.venv\Scripts\python.exe tools\make_pixel_art.py` | Rebuilds `portrait-pixel.*` + `portrait-real.*` from `assets/img/photo-source.jpg` (override with env `PORTRAIT_SRC`) |
| `C:\Users\radit\ComfyUI\.venv\Scripts\python.exe tools\compose_cards.py` | Rebuilds the two project-card montages from the real repo screenshots |
| `C:\Users\radit\ComfyUI\.venv\Scripts\python.exe tools\make_favicon.py` | Rebuilds the favicons |
| `...\rocky_env\Scripts\python.exe tools\qa_check.py` | Responsive + overflow + console-error + interaction gate (server must be running) |
| `...\rocky_env\Scripts\python.exe tools\shots.py <url> <out.png> [w] [h] [full\|scroll]` | Screenshot helper used for the diff loop |

The sky, landscape band and the five pixel-art polaroid scenes were generated
locally with ComfyUI (Flux.2 Klein) — see `assets/img/generated/`.

## Verification (this build)

- Diff loop vs the live reference at 1888×1000 (`reference/` vs `shots/`,
  `compare_images.py`): structural elements align exactly (hero card box is
  990×208, 451×447 in both); remaining pixel deltas are the intentional
  content differences (own portrait, own projects, generated sky).
- 12 page/viewport combos (three pages × 375/768/1280/1888): horizontal
  overflow = 0, zero console/page errors; touch controls ≥ 44 px on mobile.
- Interactions verified mechanically: hover reveal screenshot, cursor-tracking
  screenshot, philosophy drag cycles cards, sticker drag moves (see `tools/qa_check.py`).

## Deploy (pfarell.dev)

Static — deploy the folder anywhere. Everything for the domain is pre-wired:
`vercel.json` (clean URLs + cache headers), `robots.txt`, `sitemap.xml`, canonical +
Open Graph tags pointing at `https://pfarell.dev`, a 1200×630 `assets/img/og.png`,
and a styled `404.html`. Step-by-step GitHub → Vercel → DNS instructions live in
`DEPLOY.md`. Hosting and SSL are $0 on Vercel; the domain itself is the only cost.

## Known deviations from the reference

- Accent colour is **sky blue** (`#0ea5e9` family) at the owner's request — the reference uses green.
- The star/sparkle ornament was removed at the owner's request.
- The bottom-right button opens the **offline assistant** instead of a third-party chat widget.
- The nav pill carries an extra **theme toggle** (dark mode) that the reference does not have.
- The portrait is Farell (real photo + generated pixel art) instead of an
  anime illustration — the reference's artwork is not reusable.
- Sky/landscape are locally generated art; cloud shapes differ.
- Only two projects exist on GitHub, so the projects grid has two cards and the
  home page is shorter than the reference's four-card layout.
- The reference's Experience and Awards sections are omitted — no verified data.
- Desktop nav pill items are 40 px tall like the reference; on touch widths they
  are 44 px.
