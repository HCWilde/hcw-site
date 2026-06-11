# HCW — Eleventy migration + frictionless authoring workflow

**Date:** 2026-06-11
**Status:** Design approved, pending spec review

## Problem

The site is a hand-written static literary site (HTML + CSS, zero build, deployed
on Netlify). It looks good, but authoring has real friction:

- The `<head>`, header, footer, and Google-Fonts `<link>` are **copy-pasted into
  every HTML page** (7 files). Changing the nav means editing all of them.
- Adding a poem/thought means copying an HTML template, writing content inside
  HTML tags, and **hand-editing the index list** to add a link.
- The image gallery requires hand-wiring each thumbnail + a matching `#img-N`
  lightbox with unique ids.

Goal: make adding and modifying content **frictionless**, and keep deployment
**dead simple and free**. The author should be able to run one command, pick what
they're writing, type prose, see it live locally, and ship it — with all
metadata and git/PR mechanics handled automatically.

## Goals

- Write content as **Markdown**, never touch HTML or index lists.
- Shared layout (head/header/footer/nav) edited in **one** place.
- Indexes generated automatically from content files.
- **One command** to start writing; **one keypress** to publish.
- Deploy stays on **Netlify**, automatic on push to `main`, **free**, no secrets.
- Existing visual design preserved **exactly** (same fonts, CSS, classes, look).

## Non-goals

- No image gallery (removed — see "Sections" below).
- No client-side JavaScript shipped to visitors (site stays pure HTML + CSS).
- No CSS preprocessor / Tailwind / CSS-in-JS — plain `.css`, hand-edited as now.
- No RSS feed (can be added later; out of scope).

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| Static site generator | **Eleventy (11ty)** |
| Authoring format | **Markdown** with frontmatter |
| Build location | **Netlify** runs the build on push (no GitHub Action for deploy) |
| Deploy trigger | Push to **`main` only**; branch deploys + PR previews **off** |
| Sections | **Verses** (songs + poems) and **Thoughts** — no images |
| Verse `kind` default | **song** (override with `kind: poem`) |
| Authoring CLI | **bash + `fzf`** (`bin/hcw`): interactive menu + direct subcommands, run from the repo (no global install) |
| Editor | Configurable via `HCW_EDITOR`, **default VS Code** (`code`) |
| Publish | **GitHub auto-merge** (squash), gated on a build-check Action |
| Build-check | Lightweight **GitHub Action** builds on PRs (no deploy); required check on `main` |

## Architecture

Eleventy reads source files in `src/`, renders Markdown + Nunjucks templates, and
emits plain static HTML to `_site/`. Netlify serves `_site/`. Visitors receive the
same kind of pure HTML + CSS the site emits today; the build runs at deploy time,
never in the browser.

### Repo layout

```
hcw-site/
  .eleventy.js          # 11ty config: collections, filters, passthrough copy
  package.json          # dev-dep: @11ty/eleventy. scripts: build, serve
  netlify.toml          # build command + publish dir + main-only guard
  .nvmrc                # node version (matches netlify NODE_VERSION)
  bin/
    hcw                 # authoring CLI (bash + fzf): menu + direct subcommands
  .github/
    workflows/
      build.yml         # PR build-check (no deploy)
  src/                  # everything the author edits
    _data/
      site.json         # author, footer note, sections[] (drives nav + landing)
    _includes/
      base.njk          # THE shared <head> + header + footer
      verse.njk         # reading layout: verses (line breaks preserved)
      thought.njk       # reading layout: thoughts (prose, drop-cap, blockquote)
    index.njk           # landing (hero + realms, from site.json)
    verses/
      verses.json       # dir-data: layout + tag for every verse here
      sea.md            # migrated sample (kind: poem)
    verses.njk          # verses index (auto-lists collections.verse)
    thoughts/
      thoughts.json     # dir-data: layout + tag
      entropy.md         # migrated sample
    thoughts.njk        # thoughts index (auto-lists collections.thought)
    css/
      base.css          # design tokens + layout (gallery/lightbox blocks removed)
      poems.css         # reading layout (verse + prose) — kept
    fonts/              # passthrough
    _headers            # passthrough (Netlify response headers)
    404.njk             # → 404.html via base layout
  _site/                # GENERATED output (gitignored) — Netlify serves this
  docs/superpowers/...  # specs + plans
  README.md             # updated authoring guide
```

### Sections

Two sections only. The old `poems/`, `gallery.html`, and image/lightbox machinery
are removed.

| Section | Holds | Layout | URLs |
|---------|-------|--------|------|
| **Verses** | songs + poems | `verse.njk` | `/verses/`, `/verses/<slug>/` |
| **Thoughts** | philosophical fragments | `thought.njk` | `/thoughts/`, `/thoughts/<slug>/` |

### Shared layout & single source of truth

`_includes/base.njk` holds the one copy of: `<head>` (charset, viewport, meta
description, Google-Fonts links, `base.css` link), `<header class="masthead">`,
and `<footer class="foot">`. Every page extends it. The nav links and the landing
"realms" list both read from `src/_data/site.json`:

```json
{
  "author": "H. C. Wilde",
  "footerNote": "MMXXVI — kept by hand",
  "sections": [
    { "num": "01", "label": "Verses",   "url": "/verses/",   "blurb": "Songs, poems, lines that arrived uninvited." },
    { "num": "02", "label": "Thoughts", "url": "/thoughts/", "blurb": "Philosophical fragments, half-finished arguments." }
  ]
}
```

Editing this file updates the header on every page **and** the landing list.
`aria-current="page"` is set by comparing each nav item's `url` to `page.url`.
The landing hero copy is rewritten to drop references to photographs.

### Content model

**Verse file** (`src/verses/<slug>.md`):
```markdown
---
title: Harbour at 6am
date: 2026-06-11
kind: song      # optional; defaults to "song". use "poem" for poems
---
First stanza line one
first stanza line two

Second stanza line one
second stanza line two
```

**Thought file** (`src/thoughts/<slug>.md`):
```markdown
---
title: On Entropy and Tidy Desks
date: 2026-06-11
---
Normal markdown prose. Blank-line-separated paragraphs.

> Blockquotes work via markdown `>`.
```

Directory data files (`verses/verses.json`, `thoughts/thoughts.json`) apply the
layout + collection tag to every file in the folder, so individual files only
carry their own frontmatter:
```json
{ "layout": "verse.njk", "tags": "verse" }
```

### Verse rendering (line breaks preserved)

The existing `.verse` CSS uses `white-space: pre-wrap`, so a poet's exact line
breaks must survive. Normal Markdown collapses single newlines, so verse bodies
are **not** run through Markdown's paragraph logic.

Mechanism: a `verses` Nunjucks filter takes the raw body text, splits on blank
lines into stanzas, and emits one `<p class="verse">` per stanza with inner
newlines intact (rendered by `white-space: pre-wrap`). Raw (non-Markdown-rendered)
body is obtained via Eleventy's `templateEngineOverride` on the verses directory.

**Implementation risk + fallback:** if disabling the template engine prevents
frontmatter from being parsed, fall back to rendering verses through a dedicated
`markdown-it` instance configured with `breaks: true` (single newline → `<br>`,
blank line → new stanza paragraph) and style verse paragraphs via the `verse.njk`
layout's container class. The plan must verify which mechanism works and pick one.

The verse kicker shows `{{ kind }} · {{ roman(ordinal) }}` (e.g. `song · iii`).

### Thought rendering

`thought.njk` renders the Markdown body normally. Existing `.prose` CSS provides
the drop-cap (`p:first-of-type::first-letter`) and blockquote styling. No special
handling needed.

### Indexes

`verses.njk` and `thoughts.njk` loop `collections.verse` / `collections.thought`,
sorted by frontmatter `order` if present, else by `date`, else input path. Each
item renders an `<li class="realm">` row (ordinal, title, meta, arrow), reusing
existing `.realms` CSS. The ordinal is the item's 1-based position rendered as a
lowercase Roman numeral by a `roman` filter (`i, ii, iii, …`). Adding a content
file makes a new row appear automatically — no hand-editing.

### CSS

`css/base.css` and `css/poems.css` are **copied verbatim** (passthrough) and
linked from `base.njk` exactly as today. Templates emit the same class names the
CSS already targets (`masthead`, `nav`, `wordmark`, `realm`, `verse`, `prose`,
`reading`, `colophon`, `back`, `hero`, `page-head`, `foot`). Dark mode stays
automatic via `prefers-color-scheme`. Re-skinning is still "edit the tokens at the
top of `base.css`."

Cleanup: the gallery and `.lightbox` CSS blocks in `base.css` are removed (no
images section). All other blocks (tokens, reset, masthead, foot, hero, realms,
page-head, reveal, selection/focus) are kept unchanged.

## Deploy

`netlify.toml` (in repo, version-controlled):
```toml
[build]
  command = "npx @11ty/eleventy"
  publish = "_site"
  # cancel the build unless we're on main (belt-and-suspenders with site settings)
  ignore  = "bash -c '[ \"$BRANCH\" = \"main\" ]'"

[build.environment]
  NODE_VERSION = "20"
```

One-time Netlify site settings (Build & deploy → Continuous deployment →
Branches and deploy contexts):
- **Production branch:** `main`
- **Branch deploys:** None (only the production branch deploys)
- **Deploy Previews:** None

Result: push to `main` → Netlify clones the commit, runs `npx @11ty/eleventy`,
publishes `_site/` to its CDN. Push to any other branch → nothing deploys. No API
token or secret to manage (Netlify's GitHub App handles auth).

Existing `_headers` (security + cache-control) and a generated `404.html` continue
to work on Netlify unchanged.

## Build-check (PR gate)

`.github/workflows/build.yml`: on pull requests targeting `main`, run
`npm ci && npm run build`. It does **not** deploy — it only proves the site
builds. Made a **required status check** on `main` via branch protection (one-time
GitHub setting). GitHub auto-merge then holds a PR until this check is green.

Free: public-repo Actions minutes are unlimited; a build is ~20s.

## Authoring CLI (`bin/hcw`)

A single bash script, run from the repo: `./bin/hcw`. It drives everything via
`fzf` menus (one command to remember) and also accepts direct subcommands (skip
the menus). No global install; the script resolves its own location, so it works
from any subdirectory of the repo. Editor configurable via `HCW_EDITOR`,
default `code` (VS Code).

The script must be self-locating: it derives the repo root from its own path
(`cd "$(dirname "$0")/.."` or `git rev-parse --show-toplevel`) so all git/file
operations target the repo regardless of the caller's CWD.

### Command surface

| Invocation | Behaviour |
|------------|-----------|
| `./bin/hcw` | fzf top menu: `write` / `publish` |
| `./bin/hcw write` | fzf menu: `verses` / `thoughts`, then (for verses) `song` / `poem` |
| `./bin/hcw verse [title] [--poem]` | new verse directly (kind defaults **song**; `--poem` sets `kind: poem`) |
| `./bin/hcw thought [title]` | new thought directly |
| `./bin/hcw publish` | run the publish flow |

If a `title` argument is omitted, the script prompts for it with `read -r`
(fzf is for fixed choices; free text uses `read`).

**fzf fallback:** if `fzf` is not on `PATH`, fall back to bash's built-in
`select` menu so the tool still works. fzf is the recommended experience.

**Optional convenience (documented in README, not shipped active):** users who
want a bare `hcw` and underscore commands from anywhere can add to `~/.zshrc`:
```sh
alias hcw='/abs/path/to/hcw-site/bin/hcw'
hcw_verse()   { /abs/path/to/hcw-site/bin/hcw verse "$@"; }
hcw_thought() { /abs/path/to/hcw-site/bin/hcw thought "$@"; }
hcw_publish() { /abs/path/to/hcw-site/bin/hcw publish; }
```

### Write flow (menu or `verse`/`thought` subcommand)

1. Determine section (`verses`/`thoughts`) and, for verses, `kind`
   (`song`/`poem`) — from menu picks or subcommand + flags.
2. Read the title (argument or `read -r` prompt).
3. Slugify the title (lowercase, non-alphanumerics → hyphens, collapse repeats).
4. `git switch -c edit/<slug>` (create the edit branch).
5. Write `src/<section>/<slug>.md` with frontmatter pre-filled: `title`,
   `date` (today via `date +%F`), and `kind` for verses.
6. Start `eleventy --serve` in the background if not already running
   (`npm run serve &`), capture its PID, and open the browser
   (`open` on macOS) at the new page's URL.
7. Open the file in the editor (`${HCW_EDITOR:-code}`).

On return from the editor, an fzf (or `select`) prompt: **publish now?** →
`yes` runs the publish flow; `no` leaves the branch for `./bin/hcw publish` later.

### Publish flow (menu or `publish` subcommand)

1. `npm run build` locally; **abort** on non-zero exit (fast feedback before any
   remote action).
2. Stage + commit changes (commit message = piece title).
3. Push the `edit/<slug>` branch.
4. `gh pr create` (PR title = piece title; body auto-generated).
5. `gh pr merge --auto --squash --delete-branch` — GitHub merges once the
   build-check passes.
6. `git switch main && git pull` to sync local main.

Netlify then auto-deploys `main`.

### Prerequisites

- Node + npm (used for `@11ty/eleventy` build/serve).
- `fzf` (`brew install fzf`) — optional; `select` fallback if absent.
- `gh` CLI authenticated for the **HCWilde** GitHub account. The remote uses the
  `github-hcw` SSH host alias, so `gh`/git must be configured to push as that
  account.
- Repo: auto-merge enabled in GitHub settings; branch protection on `main`
  requiring the build-check.

## Local development

- `npm install` — once, pulls Eleventy into `node_modules/` (gitignored).
- `npm run serve` — build + serve at `http://localhost:8080`, watch files,
  auto-reload on save. Replaces `python3 -m http.server`.
- `npm run build` — one-shot build to `_site/` (exactly what Netlify runs).
- `./bin/hcw` — the authoring CLI; starts the serve itself during a write.

## Migration

- `poems/sea.html` → `src/verses/sea.md` (frontmatter `kind: poem`, body = the
  three stanzas, line breaks preserved).
- `thoughts/entropy.html` → `src/thoughts/entropy.md` (prose body, blockquote via
  `>`).
- Delete `poems/` (old), `gallery.html`, and image/lightbox markup.
- Move `css/`, `fonts/`, `_headers` under `src/` for passthrough; convert
  `404.html` → `src/404.njk` using `base.njk`.
- Rewrite landing hero copy (remove "photographs"); update README authoring guide.
- Add `_site/` to `.gitignore`.

## Testing

- **Build smoke test:** `npm run build` produces `_site/index.html`,
  `_site/verses/index.html`, `_site/verses/sea/index.html`,
  `_site/thoughts/index.html`, `_site/thoughts/entropy/index.html`, `_site/404.html`.
- **Verse line breaks:** generated `sea` page contains one `<p class="verse">` per
  stanza with internal line breaks preserved.
- **Index generation:** adding a new `src/verses/*.md` adds a row to
  `_site/verses/index.html` with the correct Roman ordinal, without editing the
  index template.
- **Shared nav:** changing `site.json` updates the header on all generated pages.
- **CLI:** the slugify helper maps titles to expected slugs (e.g.
  `"Harbour at 6am"` → `harbour-at-6am`); `./bin/hcw verse "Title"` (in a temp
  git repo) creates `src/verses/<slug>.md` with correct frontmatter (`title`,
  `date`, `kind: song`) and the `edit/<slug>` branch; `--poem` sets `kind: poem`;
  `./bin/hcw publish` aborts (non-zero, no push) when `npm run build` fails. Use
  `bats-core` or plain shell assertions; stub `git`/`gh`/`npm`/editor as needed.
- **Deploy guard:** `netlify.toml` `ignore` command exits non-zero when `BRANCH`
  != `main`.

## Open questions

None blocking. The one implementation detail to resolve during the plan is the
verse raw-body mechanism (`templateEngineOverride` vs scoped `breaks: true`
markdown) — both produce the required output; the plan picks whichever preserves
frontmatter cleanly.
