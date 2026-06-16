# HCW — collected works

A small literary site: **verses** (songs + poems) and **thoughts** (philosophical
fragments). Written in Markdown, built with [Eleventy](https://www.11ty.dev/),
deployed on Netlify. Pure HTML + CSS reaches the reader — no client-side JS.

## Write something (the easy way)

```sh
./bin/hcw            # menu: write / publish  → verses / thoughts → song / poem
```

Or skip the menu:

```sh
./bin/hcw verse "Harbour at 6am"      # new song (kind defaults to song)
./bin/hcw verse "Sea" --poem          # new poem
./bin/hcw thought "On Silence"        # new thought
./bin/hcw publish                     # ship the current edit/<slug> branch
```

`hcw` creates an `edit/<slug>` branch, writes the Markdown file with frontmatter
(title, date, kind), starts a live-reload preview, opens it in your browser, and
opens the file in your editor (`$HCW_EDITOR`, default `code`). Save → the browser
reloads. When you close the editor it asks **publish?** — yes runs the publish
flow (build-check → PR → auto-merge to `main`), no leaves the branch for later.

Optional — bare `hcw` / underscore commands from anywhere, add to `~/.zshrc`:

```sh
alias hcw='/ABSOLUTE/PATH/TO/hcw-site/bin/hcw'
hcw_verse()   { /ABSOLUTE/PATH/TO/hcw-site/bin/hcw verse "$@"; }
hcw_thought() { /ABSOLUTE/PATH/TO/hcw-site/bin/hcw thought "$@"; }
hcw_publish() { /ABSOLUTE/PATH/TO/hcw-site/bin/hcw publish; }
```

## Write something (by hand)

- **Verse:** create `src/verses/<slug>.md` with frontmatter `title`, `date`,
  optional `kind: song|poem` (default song). Body = stanzas separated by blank
  lines; line breaks inside a stanza are preserved verbatim.
- **Thought:** create `src/thoughts/<slug>.md` with `title`, `date`. Body = normal
  Markdown (paragraphs, `>` blockquotes).
- Indexes update themselves — no list to edit.

Example verse (`src/verses/winter.md`):

```markdown
---
title: Winter Arithmetic
date: 2026-06-16
kind: poem
---
The cold does its counting in the gutters,
subtracts a leaf, subtracts a hand.

What's left when the adding stops
is the only sum that ever mattered.
```

## Edit the site chrome

- Nav, footer, landing copy, sections: `src/_data/site.json` (one place — the
  header on every page and the landing list both read from it).
- Re-skin: CSS variables at the top of `src/css/base.css`. Dark mode is automatic.
- Shared `<head>`/header/footer: `src/_includes/base.njk`.

## Local preview

```sh
npm install          # once
npm run serve        # http://localhost:8080, live reload
npm run build        # one-shot build to _site/ (exactly what Netlify runs)
npm test             # build + output assertions + CLI tests
```

## Deploy

Push to `main` → Netlify builds (`npx @11ty/eleventy`, publishes `_site/`) and
deploys. Only `main` deploys (see one-time setup below). Other branches / PRs run
a GitHub Actions build-check but do not deploy. Config lives in `netlify.toml`.

## Prerequisites

- Node + npm (used for the Eleventy build/serve).
- `fzf` — for the `hcw` menus (`brew install fzf`). Optional: falls back to a
  plain text menu if absent.
- `gh` CLI authenticated for the **HCWilde** GitHub account. The remote uses the
  `github-hcw` SSH host alias, so `gh`/git must be configured to push as that
  account.

## One-time setup (manual)

1. **Netlify → Site configuration → Build & deploy → Continuous deployment →
   Branches and deploy contexts:** Production branch = `main`; Branch deploys =
   **None**; Deploy Previews = **None**.
2. **GitHub → repo Settings → General → Pull Requests:** enable **Allow
   auto-merge**.
3. **GitHub → repo Settings → Branches → branch protection rule for `main`:**
   require status checks to pass, and select the check named **`build-check / build`**
   (workflow `build-check`, job `build`). This is what `gh pr merge --auto` waits
   on before merging.

## Project layout

```
src/
  _data/site.json        # nav, footer, hero copy, sections (single source of truth)
  _includes/             # base.njk (chrome), verse.njk, thought.njk (reading layouts)
  index.njk              # landing
  verses/                # *.md verses  +  verses.json (dir-data: layout+tag)
  verses.njk             # /verses/ index (auto)
  thoughts/              # *.md thoughts +  thoughts.json
  thoughts.njk           # /thoughts/ index (auto)
  404.njk                # → 404.html
  css/ fonts/ _headers   # passed through unchanged
bin/hcw                  # authoring CLI (bash + fzf)
test/                    # build.test.mjs (output asserts) + hcw.test.sh (CLI)
.eleventy.js             # config: filters, collections, passthrough
netlify.toml             # build command + publish dir + main-only guard
.github/workflows/build.yml   # PR build-check
_site/                   # generated output (gitignored)
docs/superpowers/        # design spec + implementation plan
```
