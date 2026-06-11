# HCW Eleventy Migration + Authoring Workflow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the hand-written HTML site to an Eleventy build (Markdown source, shared layout, auto-generated indexes) with two sections (Verses, Thoughts), Netlify deploy on `main`, and a bash+fzf authoring CLI (`bin/hcw`).

**Architecture:** Eleventy reads `src/` (Markdown + Nunjucks), emits static HTML to `_site/`. One `base.njk` layout holds head/header/footer; `site.json` drives nav + landing. Collections auto-build the index lists. Netlify runs the build on push to `main`; a GitHub Action build-checks PRs. `bin/hcw` scaffolds content, previews locally, and ships via `gh` auto-merge.

**Tech Stack:** Eleventy 3 (`@11ty/eleventy`), Nunjucks templates, Node `node:test` for build assertions, bash + `fzf` for the CLI, Netlify (deploy), GitHub Actions (PR build-check), `gh` CLI.

**Spec:** `docs/superpowers/specs/2026-06-11-hcw-eleventy-authoring-workflow-design.md`

**Working branch:** `eleventy-migration` (already checked out; the spec lives here).

---

## File structure

```
.eleventy.js                     # config: dirs, engines, filters, collections, passthrough
package.json                     # @11ty/eleventy dev-dep; scripts: build, serve, test*
.nvmrc                           # 20
.gitignore                       # + _site/ , node_modules/ (node_modules already present)
netlify.toml                     # build command, publish dir, main-only ignore guard
.github/workflows/build.yml      # PR build-check (no deploy)
bin/hcw                          # bash + fzf authoring CLI
src/
  _data/site.json                # author, footerNote, hero copy, sections[]
  _includes/base.njk             # shared <head> + header + footer
  _includes/verse.njk            # reading layout: verses (raw body -> stanzas)
  _includes/thought.njk          # reading layout: thoughts (markdown prose)
  index.njk                      # landing (hero + realms)
  verses/verses.json             # dir-data: layout, tag, extraCss
  verses/sea.md                  # migrated sample (kind: poem)
  verses.njk                     # verses index
  thoughts/thoughts.json         # dir-data: layout, tag, extraCss
  thoughts/entropy.md            # migrated sample
  thoughts.njk                   # thoughts index
  404.njk                        # -> 404.html
  css/base.css                   # moved from /css; gallery+lightbox blocks removed
  css/poems.css                  # moved from /css; unchanged
  fonts/.gitkeep                 # moved from /fonts
  _headers                       # moved from /_headers
test/
  build.test.mjs                 # asserts _site output after a build
  hcw.test.sh                    # asserts slugify + scaffold + publish-abort
README.md                        # rewritten authoring guide
```

Old top-level files (`index.html`, `gallery.html`, `404.html`, `poems/`, `thoughts/*.html`, root `css/`, root `fonts/`, root `_headers`) are removed in Task 10 once `src/` drives everything.

---

## Task 1: Project scaffold (npm + Eleventy)

**Files:**
- Create: `package.json`, `.nvmrc`
- Modify: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "hcw-site",
  "version": "1.0.0",
  "private": true,
  "description": "HCW — collected works (Eleventy static site)",
  "scripts": {
    "build": "eleventy",
    "serve": "eleventy --serve",
    "test:build": "node --test test/build.test.mjs",
    "test:cli": "bash test/hcw.test.sh",
    "test": "npm run build && npm run test:build && npm run test:cli"
  },
  "devDependencies": {
    "@11ty/eleventy": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create `.nvmrc`**

```
20
```

- [ ] **Step 3: Append to `.gitignore`**

Add these two lines to the existing `.gitignore`:

```
_site/
node_modules/
```

(`node_modules/` may already be present — keep a single entry.)

- [ ] **Step 4: Install Eleventy**

Run: `npm install`
Expected: creates `node_modules/`, `package-lock.json`; exit 0.

- [ ] **Step 5: Verify the binary**

Run: `npx eleventy --version`
Expected: prints a `3.x` version, exit 0.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .nvmrc .gitignore
git commit -m "Scaffold npm project with Eleventy"
```

---

## Task 2: Eleventy config, site data, base layout, landing page

This produces the first real build output: a styled landing page with shared nav/footer driven by `site.json`. CSS is moved under `src/` so passthrough copy works.

**Files:**
- Create: `.eleventy.js`, `src/_data/site.json`, `src/_includes/base.njk`, `src/index.njk`
- Move: `css/` → `src/css/`, `fonts/` → `src/fonts/`, `_headers` → `src/_headers`
- Create test: `test/build.test.mjs`

- [ ] **Step 1: Move static assets into `src/`**

```bash
mkdir -p src
git mv css src/css
git mv fonts src/fonts
git mv _headers src/_headers
```
Expected: `src/css/base.css`, `src/css/poems.css`, `src/fonts/.gitkeep`, `src/_headers` exist.

- [ ] **Step 2: Create `.eleventy.js`**

```js
module.exports = function (eleventyConfig) {
  // ---- passthrough copy (assets emitted unchanged) ----
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/fonts": "fonts" });
  eleventyConfig.addPassthroughCopy({ "src/_headers": "_headers" });

  // ---- filters ----
  eleventyConfig.addFilter("startsWith", (s, p) => String(s).startsWith(p));

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    // content files are plain Markdown/HTML — no Nunjucks preprocessing of bodies
    markdownTemplateEngine: false,
    htmlTemplateEngine: "njk",
  };
};
```

- [ ] **Step 3: Create `src/_data/site.json`**

```json
{
  "title": "HCW — collected works",
  "description": "Songs, poems, and philosophical fragments by H. C. Wilde.",
  "author": "H. C. Wilde",
  "footerNote": "MMXXVI — kept by hand",
  "heroHeading": "Things I made in the <em>quiet</em> hours.",
  "heroLede": "Songs and poems written and abandoned, and thoughts that wanted somewhere to live. A small room, mostly empty, with the lamp left on.",
  "sections": [
    { "num": "01", "label": "Verses",   "url": "/verses/",   "blurb": "Songs, poems, and lines that arrived uninvited." },
    { "num": "02", "label": "Thoughts", "url": "/thoughts/", "blurb": "Philosophical fragments, half-finished arguments." }
  ]
}
```

- [ ] **Step 4: Create `src/_includes/base.njk`**

```njk
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{% if title %}{{ title }} — HCW{% else %}{{ site.title }}{% endif %}</title>
  <meta name="description" content="{{ description or site.description }}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..600&family=Newsreader:ital,opsz@0,6..72;1,6..72&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/base.css" />
  {% if extraCss %}<link rel="stylesheet" href="{{ extraCss }}" />{% endif %}
</head>
<body>

  <header class="wrap masthead">
    <a class="wordmark" href="/">H·C·<span>W</span></a>
    <nav class="nav">
      {% for s in site.sections %}
      <a href="{{ s.url }}"{% if page.url | startsWith(s.url) %} aria-current="page"{% endif %}>{{ s.label }}</a>
      {% endfor %}
    </nav>
  </header>

  {{ content | safe }}

  <footer class="wrap foot">
    <span>{{ site.author }}</span>
    <span>{{ site.footerNote }}</span>
  </footer>

</body>
</html>
```

- [ ] **Step 5: Create `src/index.njk`**

```njk
---
layout: base.njk
---
<main class="wrap">
  <section class="hero reveal">
    <p class="eyebrow">collected works</p>
    <h1>{{ site.heroHeading | safe }}</h1>
    <p class="lede">{{ site.heroLede }}</p>
  </section>

  <ul class="realms reveal">
    {% for s in site.sections %}
    <li class="realm">
      <a href="{{ s.url }}">
        <span class="num">{{ s.num }}</span>
        <span class="title">{{ s.label }}<small>{{ s.blurb }}</small></span>
        <span class="arrow">→</span>
      </a>
    </li>
    {% endfor %}
  </ul>
</main>
```

- [ ] **Step 6: Write the failing build test** — `test/build.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../_site/${p}`, import.meta.url), "utf8");
const has = (p) => existsSync(new URL(`../_site/${p}`, import.meta.url));

test("landing page builds with shared chrome", () => {
  assert.ok(has("index.html"), "_site/index.html exists");
  const html = read("index.html");
  assert.match(html, /class="masthead"/, "has shared header");
  assert.match(html, /href="\/verses\/"/, "nav links to verses");
  assert.match(html, /href="\/thoughts\/"/, "nav links to thoughts");
  assert.match(html, /quiet/, "renders hero heading");
});

test("css is passed through", () => {
  assert.ok(has("css/base.css"), "_site/css/base.css exists");
});
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `npm run test:build`
Expected: FAIL — `_site/index.html` does not exist yet (build not run).

- [ ] **Step 8: Build, then run the test to verify it passes**

Run: `npm run build && npm run test:build`
Expected: build writes `_site/index.html` + `_site/css/base.css`; test PASSES.

- [ ] **Step 9: Commit**

```bash
git add .eleventy.js src/_data/site.json src/_includes/base.njk src/index.njk src/css src/fonts src/_headers test/build.test.mjs
git commit -m "Add Eleventy config, site data, base layout, landing page"
```

---

## Task 3: Filters and collections

Add the filters and sorted collections the verse/thought layouts and indexes depend on. Collections are empty until content exists (Tasks 4/6), so this task just wires them and re-verifies the build.

**Files:**
- Modify: `.eleventy.js`

- [ ] **Step 1: Add filters + collections to `.eleventy.js`**

Insert the helper functions at the top of the file (above `module.exports`):

```js
function romanize(num) {
  const map = [[1000,"m"],[900,"cm"],[500,"d"],[400,"cd"],[100,"c"],[90,"xc"],[50,"l"],[40,"xl"],[10,"x"],[9,"ix"],[5,"v"],[4,"iv"],[1,"i"]];
  let n = Number(num) || 0, out = "";
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return out;
}

function versesToHtml(raw) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return String(raw)
    .trim()
    .split(/\n\s*\n/)
    .filter((s) => s.trim() !== "")
    .map((stanza) => `<p class="verse">${esc(stanza)}</p>`)
    .join("\n");
}

function byOrder(a, b) {
  const ao = a.data.order ?? Infinity, bo = b.data.order ?? Infinity;
  if (ao !== bo) return ao - bo;
  if (a.date - b.date !== 0) return a.date - b.date;
  return a.inputPath.localeCompare(b.inputPath);
}
```

Then add inside `module.exports`, after the `startsWith` filter:

```js
  eleventyConfig.addFilter("roman", romanize);
  eleventyConfig.addFilter("verses", versesToHtml);
  eleventyConfig.addFilter("year", (d) => new Date(d).getFullYear());
  eleventyConfig.addFilter("ordinalOf", (collection, url) => {
    const i = collection.findIndex((item) => item.url === url);
    return i < 0 ? 1 : i + 1;
  });

  eleventyConfig.addCollection("verse", (c) => c.getFilteredByTag("verse").sort(byOrder));
  eleventyConfig.addCollection("thought", (c) => c.getFilteredByTag("thought").sort(byOrder));
```

- [ ] **Step 2: Verify the build still passes**

Run: `npm run build && npm run test:build`
Expected: PASS (no content yet; collections are empty but valid).

- [ ] **Step 3: Commit**

```bash
git add .eleventy.js
git commit -m "Add roman/verses/year/ordinalOf filters and sorted collections"
```

---

## Task 4: Verses — layout, dir-data, migrate sample poem

**Files:**
- Create: `src/verses/verses.json`, `src/_includes/verse.njk`, `src/verses/sea.md`
- Modify: `test/build.test.mjs`

- [ ] **Step 1: Create `src/verses/verses.json`** (directory data — applies to every `.md` here)

```json
{
  "layout": "verse.njk",
  "tags": "verse",
  "extraCss": "/css/poems.css"
}
```

- [ ] **Step 2: Create `src/_includes/verse.njk`**

The poem body must keep the poet's exact line breaks, so it is rendered from the raw input (`page.rawInput`, Markdown processing disabled) through the `verses` filter — not from the Markdown-rendered `content`.

```njk
---
layout: base.njk
---
<main class="reading reveal">
  <p class="kicker">{{ kind or "song" }} · {{ collections.verse | ordinalOf(page.url) | roman }}</p>
  <h1>{{ title }}</h1>
  <p class="meta">{{ page.date | year }}</p>

  {{ page.rawInput | verses | safe }}

  <div class="colophon">
    <p>{{ colophon or "Written in the quiet hours. Revise freely — it is only paper." }}</p>
    <a class="back" href="/verses/">← all verses</a>
  </div>
</main>
```

- [ ] **Step 3: Create `src/verses/sea.md`** (migrated from `poems/sea.html`)

```markdown
---
title: The Sea Does Not Remember
date: 2026-01-01
kind: poem
---
All night the water practiced your name
and by morning had forgotten the vowels,
keeping only the salt, the small insistence,
the way a thing returns without meaning to.

I have been told the tide is not grief.
It is only the moon, doing its arithmetic,
pulling and letting go, pulling and letting go,
indifferent as arithmetic always is.

Still I come down to the edge of it,
where the land gives up its argument,
and stand where everything that leaves
agrees, for once, to leave so gently.
```

- [ ] **Step 4: Add a failing assertion to `test/build.test.mjs`**

Append:

```js
test("verse page preserves stanzas as verse paragraphs", () => {
  assert.ok(has("verses/sea/index.html"), "verse page built at pretty URL");
  const html = read("verses/sea/index.html");
  const stanzas = html.match(/<p class="verse">/g) || [];
  assert.equal(stanzas.length, 3, "three stanzas -> three verse paragraphs");
  assert.match(html, /poem · i/, "kicker shows kind + roman ordinal");
  assert.match(html, /All night the water practiced your name\n/, "line breaks preserved inside a stanza");
  assert.match(html, /poems\.css/, "links the reading stylesheet");
});
```

- [ ] **Step 5: Run to verify it fails**

Run: `npm run test:build`
Expected: FAIL — `_site/verses/sea/index.html` missing (build not re-run / page not built).

- [ ] **Step 6: Build and verify it passes**

Run: `npm run build && npm run test:build`
Expected: PASS. If `page.rawInput` is empty or stanzas count is 0, apply the fallback in Step 7; otherwise skip it.

- [ ] **Step 7: (Only if Step 6 failed on rawInput) Fallback**

If `page.rawInput` is unavailable in the installed Eleventy version, set the body to raw and read `content` instead:
- Add `"templateEngineOverride": false` to `src/verses/verses.json`.
- In `verse.njk`, replace `{{ page.rawInput | verses | safe }}` with `{{ content | verses | safe }}`.
- Re-run `npm run build && npm run test:build` → expect PASS.

- [ ] **Step 8: Commit**

```bash
git add src/verses/verses.json src/_includes/verse.njk src/verses/sea.md test/build.test.mjs
git commit -m "Add verses layout and migrate sample poem"
```

---

## Task 5: Verses index

**Files:**
- Create: `src/verses.njk`
- Modify: `test/build.test.mjs`

- [ ] **Step 1: Create `src/verses.njk`**

```njk
---
layout: base.njk
title: Verses
permalink: /verses/
---
<main class="wrap">
  <section class="page-head reveal">
    <p class="eyebrow">01 — verses</p>
    <h1>Verses</h1>
  </section>

  <ul class="realms reveal">
    {% for v in collections.verse %}
    <li class="realm">
      <a href="{{ v.url }}">
        <span class="num">{{ loop.index | roman }}</span>
        <span class="title">{{ v.data.title }}<small>{{ v.date | year }} · {{ v.data.kind or "song" }}</small></span>
        <span class="arrow">→</span>
      </a>
    </li>
    {% endfor %}
  </ul>
</main>
```

- [ ] **Step 2: Add a failing assertion to `test/build.test.mjs`**

```js
test("verses index lists pieces with roman ordinals", () => {
  assert.ok(has("verses/index.html"), "verses index built");
  const html = read("verses/index.html");
  assert.match(html, /The Sea Does Not Remember/, "lists the sample verse");
  assert.match(html, /href="\/verses\/sea\/"/, "links to the verse page");
  assert.match(html, /<span class="num">i<\/span>/, "first item numbered i");
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test:build`
Expected: FAIL — `_site/verses/index.html` missing.

- [ ] **Step 4: Build and verify it passes**

Run: `npm run build && npm run test:build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/verses.njk test/build.test.mjs
git commit -m "Add verses index page"
```

---

## Task 6: Thoughts — layout, dir-data, migrate sample fragment

**Files:**
- Create: `src/thoughts/thoughts.json`, `src/_includes/thought.njk`, `src/thoughts/entropy.md`
- Modify: `test/build.test.mjs`

- [ ] **Step 1: Create `src/thoughts/thoughts.json`**

```json
{
  "layout": "thought.njk",
  "tags": "thought",
  "extraCss": "/css/poems.css"
}
```

- [ ] **Step 2: Create `src/_includes/thought.njk`**

Thoughts are normal Markdown; `content` is the rendered prose, wrapped in `.prose` for the drop-cap + blockquote styling.

```njk
---
layout: base.njk
---
<main class="reading reveal">
  <p class="kicker">fragment · {{ collections.thought | ordinalOf(page.url) | roman }}</p>
  <h1>{{ title }}</h1>
  <p class="meta">{{ page.date | year }}</p>

  <div class="prose">
    {{ content | safe }}
  </div>

  <div class="colophon">
    <p>{{ colophon or "A fragment, deliberately unfinished." }}</p>
    <a class="back" href="/thoughts/">← all thoughts</a>
  </div>
</main>
```

Note: `thought.njk` is a layout, so its body is Nunjucks regardless of `markdownTemplateEngine`. The Markdown rendering applies to the `.md` content file, whose output arrives as `content`.

- [ ] **Step 3: Create `src/thoughts/entropy.md`** (migrated from `thoughts/entropy.html`)

```markdown
---
title: On Entropy and Tidy Desks
date: 2026-01-01
---
Order is not a state but a verb. The tidy desk is not a fact about the world; it is a sentence the world is busy un-writing the moment you set down the pen. We mistake the photograph for the river.

Every act of arrangement borrows against the future. To make one corner of the room coherent is to export the disorder elsewhere — into the cupboard, into tomorrow, into the slow heat of the body doing the arranging.

> What we call discipline is only the rent we pay on a structure the universe never agreed to maintain.

And yet. Knowing this, I still straighten the books. Not because it lasts, but because the straightening is the one stretch of time in which the meaning and the motion are the same thing — and that, perhaps, is all that order was ever for.
```

- [ ] **Step 4: Add a failing assertion to `test/build.test.mjs`**

```js
test("thought page renders prose and blockquote", () => {
  assert.ok(has("thoughts/entropy/index.html"), "thought page built");
  const html = read("thoughts/entropy/index.html");
  assert.match(html, /class="prose"/, "wrapped in prose");
  assert.match(html, /<blockquote>/, "markdown > becomes blockquote");
  assert.match(html, /fragment · i/, "kicker shows fragment + roman");
  assert.match(html, /Order is not a state but a verb/, "renders body text");
});
```

- [ ] **Step 5: Run to verify it fails**

Run: `npm run test:build`
Expected: FAIL — thought page missing.

- [ ] **Step 6: Build and verify it passes**

Run: `npm run build && npm run test:build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/thoughts/thoughts.json src/_includes/thought.njk src/thoughts/entropy.md test/build.test.mjs
git commit -m "Add thoughts layout and migrate sample fragment"
```

---

## Task 7: Thoughts index

**Files:**
- Create: `src/thoughts.njk`
- Modify: `test/build.test.mjs`

- [ ] **Step 1: Create `src/thoughts.njk`**

```njk
---
layout: base.njk
title: Thoughts
permalink: /thoughts/
---
<main class="wrap">
  <section class="page-head reveal">
    <p class="eyebrow">02 — thoughts</p>
    <h1>Thoughts</h1>
  </section>

  <ul class="realms reveal">
    {% for t in collections.thought %}
    <li class="realm">
      <a href="{{ t.url }}">
        <span class="num">{{ loop.index | roman }}</span>
        <span class="title">{{ t.data.title }}<small>{{ t.date | year }}</small></span>
        <span class="arrow">→</span>
      </a>
    </li>
    {% endfor %}
  </ul>
</main>
```

- [ ] **Step 2: Add a failing assertion to `test/build.test.mjs`**

```js
test("thoughts index lists pieces", () => {
  assert.ok(has("thoughts/index.html"), "thoughts index built");
  const html = read("thoughts/index.html");
  assert.match(html, /On Entropy and Tidy Desks/, "lists the sample thought");
  assert.match(html, /href="\/thoughts\/entropy\/"/, "links to the thought page");
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test:build`
Expected: FAIL — thoughts index missing.

- [ ] **Step 4: Build and verify it passes**

Run: `npm run build && npm run test:build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/thoughts.njk test/build.test.mjs
git commit -m "Add thoughts index page"
```

---

## Task 8: 404 page

**Files:**
- Create: `src/404.njk`
- Modify: `test/build.test.mjs`

- [ ] **Step 1: Create `src/404.njk`** (migrated from `404.html`, using the shared layout)

```njk
---
layout: base.njk
title: Lost
permalink: /404.html
---
<main class="wrap hero reveal">
  <p class="eyebrow">404</p>
  <h1>This page took the <em>tide</em> out.</h1>
  <p class="lede">Nothing lives at that address. Perhaps it was never written,
    or perhaps it was — and then revised away.</p>
  <p style="margin-top:2rem"><a class="back" href="/" style="font-family:var(--font-mono);font-size:.8rem;letter-spacing:.1em;text-decoration:none;border-bottom:1px solid var(--rust)">← back to the beginning</a></p>
</main>
```

- [ ] **Step 2: Add a failing assertion to `test/build.test.mjs`**

```js
test("404 page builds", () => {
  assert.ok(has("404.html"), "_site/404.html exists");
  assert.match(read("404.html"), /took the/, "renders 404 copy");
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test:build`
Expected: FAIL — `_site/404.html` missing.

- [ ] **Step 4: Build and verify it passes**

Run: `npm run build && npm run test:build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/404.njk test/build.test.mjs
git commit -m "Add 404 page using shared layout"
```

---

## Task 9: CSS cleanup (remove gallery + lightbox)

The Images section is gone. Remove the now-unused gallery and lightbox CSS from `src/css/base.css`. Keep everything else.

**Files:**
- Modify: `src/css/base.css`

- [ ] **Step 1: Delete the gallery + lightbox blocks**

In `src/css/base.css`, remove the entire section starting at the comment:
```
/* =========================================================================
   GALLERY  (CSS columns masonry + :target lightbox, no JS)
   ========================================================================= */
```
through the end of the `.lightbox .close { ... }` rule (the block that defines `.page-head`, `.gallery`, and `.lightbox`).

Then re-add the `.page-head` rules (still used by the Verses/Thoughts index pages) immediately after the LANDING section:

```css
/* =========================================================================
   SECTION HEAD (verses / thoughts index)
   ========================================================================= */
.page-head {
  padding: clamp(2.5rem, 7vw, 5rem) 0 clamp(1.5rem, 4vw, 3rem);
}
.page-head .eyebrow {
  font-family: var(--font-mono);
  font-size: 0.74rem;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--rust);
  margin-bottom: 1rem;
}
.page-head h1 {
  font-family: var(--font-display);
  font-weight: 360;
  font-size: clamp(2.2rem, 1rem + 5vw, 4rem);
  letter-spacing: -0.015em;
}
```

(Net effect: `.page-head` is preserved; `.gallery` and `.lightbox` rules are deleted.)

- [ ] **Step 2: Add a regression assertion to `test/build.test.mjs`**

```js
test("gallery/lightbox css removed", () => {
  const css = read("css/base.css");
  assert.doesNotMatch(css, /\.lightbox/, "no lightbox rules remain");
  assert.doesNotMatch(css, /\.gallery/, "no gallery rules remain");
  assert.match(css, /\.page-head/, "page-head retained for index pages");
});
```

- [ ] **Step 3: Build and verify it passes**

Run: `npm run build && npm run test:build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/css/base.css test/build.test.mjs
git commit -m "Remove unused gallery and lightbox CSS"
```

---

## Task 10: Remove obsolete top-level files

The old hand-written pages are replaced by `src/`. Remove them so the repo has one source of truth.

**Files:**
- Delete: `index.html`, `gallery.html`, `404.html`, `poems/`, `thoughts/entropy.html`, `thoughts/index.html`, `scripts/`

- [ ] **Step 1: Confirm what is being deleted**

Run: `git ls-files index.html gallery.html 404.html poems thoughts scripts`
Expected: lists the old root pages (`index.html`, `gallery.html`, `404.html`, `poems/index.html`, `poems/sea.html`, `thoughts/index.html`, `thoughts/entropy.html`, `scripts/.gitkeep`). These are the pre-migration originals — `css/`, `fonts/`, `_headers` already moved under `src/` in Task 2.

- [ ] **Step 2: Remove them**

```bash
git rm -r index.html gallery.html 404.html poems thoughts/index.html thoughts/entropy.html scripts
```
(If `thoughts/` is now empty at repo root, it is removed automatically. `images/` at root, if present and empty/unused, also remove: `git rm -r images` — only if it holds no wanted files.)

- [ ] **Step 3: Build and verify everything still passes**

Run: `npm run build && npm run test:build`
Expected: PASS (output comes entirely from `src/`).

- [ ] **Step 4: Commit**

```bash
git commit -m "Remove obsolete pre-migration HTML files"
```

---

## Task 11: Deploy config (netlify.toml + PR build-check)

**Files:**
- Create: `netlify.toml`, `.github/workflows/build.yml`

- [ ] **Step 1: Create `netlify.toml`**

```toml
[build]
  command = "npx @11ty/eleventy"
  publish = "_site"
  # cancel the build unless we're on main (belt-and-suspenders with site settings)
  ignore  = "bash -c '[ \"$BRANCH\" = \"main\" ]'"

[build.environment]
  NODE_VERSION = "20"
```

- [ ] **Step 2: Create `.github/workflows/build.yml`**

```yaml
name: build-check
on:
  pull_request:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run build
```

- [ ] **Step 3: Sanity-check the ignore guard locally**

Run: `BRANCH=feature bash -c '[ "$BRANCH" = "main" ]'; echo "exit=$?"`
Expected: `exit=1` (non-main → Netlify skips build).
Run: `BRANCH=main bash -c '[ "$BRANCH" = "main" ]'; echo "exit=$?"`
Expected: `exit=0` (main → build proceeds).

- [ ] **Step 4: Commit**

```bash
git add netlify.toml .github/workflows/build.yml
git commit -m "Add Netlify build config and PR build-check workflow"
```

---

## Task 12: `bin/hcw` — library functions + dispatch skeleton

Build the CLI bottom-up: pure helpers first (testable), then dispatch. The script self-locates the repo root and supports a `HCW_LIB=1` source mode so tests can load functions without running.

**Files:**
- Create: `bin/hcw`
- Create test: `test/hcw.test.sh`

- [ ] **Step 1: Create `bin/hcw`**

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
EDITOR_CMD="${HCW_EDITOR:-code}"

slugify() {
  printf '%s' "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//'
}

# menu PROMPT OPTION...  -> prints the chosen option
menu() {
  local prompt="$1"; shift
  if command -v fzf >/dev/null 2>&1; then
    printf '%s\n' "$@" | fzf --prompt="$prompt> " --height=40% --reverse
  else
    local opt
    PS3="$prompt> "
    select opt in "$@"; do [ -n "${opt:-}" ] && { printf '%s\n' "$opt"; return; }; done
  fi
}

# scaffold SECTION KIND TITLE  -> creates edit branch + frontmatter file, prints the file path
scaffold() {
  local section="$1" kind="${2:-}" title="$3"
  local slug; slug="$(slugify "$title")"
  local file="$REPO_ROOT/src/$section/$slug.md"
  ( cd "$REPO_ROOT" && git switch -c "edit/$slug" )
  mkdir -p "$REPO_ROOT/src/$section"
  {
    echo "---"
    echo "title: $title"
    echo "date: $(date +%F)"
    [ "$section" = "verses" ] && echo "kind: ${kind:-song}"
    echo "---"
    echo ""
  } > "$file"
  printf '%s\n' "$file"
}

# allow tests to source the helpers above without running the dispatcher
if [ "${HCW_LIB:-}" = "1" ]; then
  return 0 2>/dev/null || exit 0
fi

main() {
  echo "hcw: not yet implemented" >&2
  exit 1
}

main "$@"
```

- [ ] **Step 2: Make it executable**

Run: `chmod +x bin/hcw`

- [ ] **Step 3: Write the failing CLI test** — `test/hcw.test.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { echo "FAIL: $1" >&2; exit 1; }

# --- slugify ---
HCW_LIB=1 source "$ROOT/bin/hcw"
[ "$(slugify 'Harbour at 6am')" = "harbour-at-6am" ] || fail "slugify basic"
[ "$(slugify '  The Sea, Remembered!  ')" = "the-sea-remembered" ] || fail "slugify punctuation/trim"

echo "PASS: hcw slugify"
```

- [ ] **Step 4: Run to verify it fails**

Run: `npm run test:cli`
Expected: FAIL — `bin/hcw` does not exist yet at first run / functions undefined. (After Step 1–2 exist, this step's failure is only if slugify is wrong; ensure the test was authored before relying on output.)

- [ ] **Step 5: Run to verify it passes**

Run: `npm run test:cli`
Expected: `PASS: hcw slugify`, exit 0.

- [ ] **Step 6: Commit**

```bash
git add bin/hcw test/hcw.test.sh
git commit -m "Add hcw CLI skeleton with slugify and menu helpers"
```

---

## Task 13: `bin/hcw` — scaffold (branch + file) tested in a temp repo

**Files:**
- Modify: `test/hcw.test.sh`

(The `scaffold` function already exists from Task 12. This task proves it end-to-end in an isolated git repo.)

- [ ] **Step 1: Append a failing scaffold test to `test/hcw.test.sh`**

Insert before the final `echo "PASS..."` line (or add a new section):

```bash
# --- scaffold (isolated temp git repo) ---
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git -C "$TMP" init -q
git -C "$TMP" commit -q --allow-empty -m init
mkdir -p "$TMP/bin"
cp "$ROOT/bin/hcw" "$TMP/bin/hcw"

OUT="$(cd "$TMP" && HCW_LIB=1 bash -c 'source bin/hcw; scaffold verses poem "Test Title"')"
[ "$OUT" = "$TMP/src/verses/test-title.md" ] || fail "scaffold returns file path ($OUT)"
[ -f "$TMP/src/verses/test-title.md" ] || fail "scaffold created file"
grep -q '^title: Test Title$'  "$TMP/src/verses/test-title.md" || fail "frontmatter title"
grep -q '^kind: poem$'         "$TMP/src/verses/test-title.md" || fail "frontmatter kind"
grep -q '^date: [0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}$' "$TMP/src/verses/test-title.md" || fail "frontmatter date"
[ "$(git -C "$TMP" rev-parse --abbrev-ref HEAD)" = "edit/test-title" ] || fail "edit branch created"

echo "PASS: hcw scaffold"
```

- [ ] **Step 2: Run to verify it fails (if scaffold has a bug) or passes**

Run: `npm run test:cli`
Expected: PASS — `PASS: hcw slugify` and `PASS: hcw scaffold`. If it fails, fix `scaffold` in `bin/hcw` until green.

- [ ] **Step 3: Commit**

```bash
git add test/hcw.test.sh
git commit -m "Test hcw scaffold creates branch + frontmatter file"
```

---

## Task 14: `bin/hcw` — write flow (serve, browser, editor, publish prompt) + dispatch

**Files:**
- Modify: `bin/hcw`

- [ ] **Step 1: Replace the `main()` stub with the full implementation**

Replace the `main() { ... }` block in `bin/hcw` with:

```bash
ensure_serve() {
  [ "${HCW_NONINTERACTIVE:-}" = "1" ] && return 0
  if ! curl -fsS -o /dev/null http://localhost:8080/ 2>/dev/null; then
    ( cd "$REPO_ROOT" && npm run serve >/tmp/hcw-serve.log 2>&1 & )
    for _ in $(seq 1 30); do
      curl -fsS -o /dev/null http://localhost:8080/ 2>/dev/null && break
      sleep 0.5
    done
  fi
}

write_piece() {
  local section="$1" kind="${2:-}" title="${3:-}"
  if [ -z "$title" ]; then read -r -p "Title: " title; fi
  [ -n "$title" ] || { echo "title required" >&2; exit 1; }

  local file slug
  file="$(scaffold "$section" "$kind" "$title")"
  slug="$(basename "$file" .md)"

  if [ "${HCW_NONINTERACTIVE:-}" = "1" ]; then
    printf '%s\n' "$file"; return 0
  fi

  ensure_serve
  local url="http://localhost:8080/$section/$slug/"
  command -v open >/dev/null 2>&1 && open "$url" || true
  "$EDITOR_CMD" "$file" || true

  local ans; ans="$(menu "publish?" "no" "yes")"
  if [ "$ans" = "yes" ]; then
    publish_piece "$title"
  else
    echo "Left on branch edit/$slug. Run ./bin/hcw publish to ship." >&2
  fi
}

choose_write() {
  local sub; sub="$(menu "write" "verses" "thoughts")"
  case "$sub" in
    verses)   write_piece verses "$(menu "kind" "song" "poem")" "" ;;
    thoughts) write_piece thoughts "" "" ;;
  esac
}

main() {
  local cmd="${1:-}"
  case "$cmd" in
    "")        case "$(menu "hcw" "write" "publish")" in
                 write)   choose_write ;;
                 publish) publish_piece ;;
               esac ;;
    write)     choose_write ;;
    verse)     shift; local kind="song" title=""
               while [ $# -gt 0 ]; do
                 case "$1" in --poem) kind="poem" ;; *) title="$1" ;; esac; shift
               done
               write_piece verses "$kind" "$title" ;;
    thought)   shift; write_piece thoughts "" "${1:-}" ;;
    publish)   publish_piece ;;
    *)         echo "usage: hcw [write|verse [title] [--poem]|thought [title]|publish]" >&2; exit 1 ;;
  esac
}

main "$@"
```

Note: `publish_piece` is added in Task 15. Until then, `hcw publish` and choosing "yes" at the prompt will error with "command not found" — acceptable mid-build; Task 15 completes it.

- [ ] **Step 2: Verify dispatch + non-interactive scaffold path**

Run:
```bash
TMP="$(mktemp -d)"; git -C "$TMP" init -q; git -C "$TMP" commit -q --allow-empty -m init
mkdir -p "$TMP/bin"; cp bin/hcw "$TMP/bin/hcw"
( cd "$TMP" && HCW_NONINTERACTIVE=1 ./bin/hcw verse --poem "Quiet Morning" )
ls "$TMP/src/verses/quiet-morning.md"; rm -rf "$TMP"
```
Expected: prints the created file path and `ls` finds `quiet-morning.md`; exit 0.

- [ ] **Step 3: Verify existing tests still pass**

Run: `npm run test:cli`
Expected: PASS (slugify + scaffold).

- [ ] **Step 4: Commit**

```bash
git add bin/hcw
git commit -m "Add hcw write flow, serve/editor wiring, and command dispatch"
```

---

## Task 15: `bin/hcw` — publish flow + abort-on-failed-build test

**Files:**
- Modify: `bin/hcw`, `test/hcw.test.sh`

- [ ] **Step 1: Add `publish_piece` to `bin/hcw`**

Insert this function above `main()`:

```bash
publish_piece() {
  local title="${1:-}"
  ( cd "$REPO_ROOT" && npm run build )   # set -e aborts here on failure -> nothing pushed

  cd "$REPO_ROOT"
  local branch; branch="$(git rev-parse --abbrev-ref HEAD)"
  [ -z "$title" ] && title="${branch#edit/}"

  git add -A
  git commit -m "$title"
  git push -u origin "$branch"
  gh pr create --base main --head "$branch" --title "$title" --body "Add ${title}."
  gh pr merge --auto --squash --delete-branch
  git switch main
  git pull
}
```

- [ ] **Step 2: Add a failing abort-on-build-failure test to `test/hcw.test.sh`**

Append before any final summary line:

```bash
# --- publish aborts when build fails, never pushes ---
TMP2="$(mktemp -d)"
trap 'rm -rf "$TMP" "$TMP2"' EXIT
git -C "$TMP2" init -q
git -C "$TMP2" commit -q --allow-empty -m init
mkdir -p "$TMP2/bin" "$TMP2/stub"
cp "$ROOT/bin/hcw" "$TMP2/bin/hcw"

# stub npm (build fails) + git/gh (record calls) so nothing real happens
cat > "$TMP2/stub/npm" <<'EOF'
#!/usr/bin/env bash
[ "$1" = "run" ] && [ "$2" = "build" ] && { echo "build failed" >&2; exit 1; }
exit 0
EOF
cat > "$TMP2/stub/gh" <<'EOF'
#!/usr/bin/env bash
echo "gh $*" >> "$HCW_CALLS"
EOF
chmod +x "$TMP2/stub/npm" "$TMP2/stub/gh"

export HCW_CALLS="$TMP2/calls.log"; : > "$HCW_CALLS"
set +e
( cd "$TMP2" && PATH="$TMP2/stub:$PATH" ./bin/hcw publish )
rc=$?
set -e
[ "$rc" -ne 0 ] || fail "publish should exit non-zero when build fails"
[ ! -s "$HCW_CALLS" ] || fail "publish must not call gh when build fails"

echo "PASS: hcw publish aborts on build failure"
```

- [ ] **Step 3: Run to verify it passes**

Run: `npm run test:cli`
Expected: `PASS: hcw slugify`, `PASS: hcw scaffold`, `PASS: hcw publish aborts on build failure`; exit 0.

- [ ] **Step 4: Commit**

```bash
git add bin/hcw test/hcw.test.sh
git commit -m "Add hcw publish flow with build-check abort guard"
```

---

## Task 16: README + full test run + manual setup checklist

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rewrite `README.md`**

```markdown
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
  lines; line breaks inside a stanza are preserved.
- **Thought:** create `src/thoughts/<slug>.md` with `title`, `date`. Body = normal
  Markdown (paragraphs, `>` blockquotes).
- Indexes update themselves — no list to edit.

## Edit the site chrome

- Nav, footer, landing copy, sections: `src/_data/site.json` (one place).
- Re-skin: CSS variables at the top of `src/css/base.css`. Dark mode is automatic.
- Shared `<head>`/header/footer: `src/_includes/base.njk`.

## Local preview

```sh
npm install          # once
npm run serve        # http://localhost:8080, live reload
npm run build        # one-shot build to _site/ (what Netlify runs)
npm test             # build + output assertions + CLI tests
```

## Deploy

Push to `main` → Netlify builds (`npx @11ty/eleventy`, publish `_site`) and
deploys. Only `main` deploys (see one-time setup below). Other branches/PRs run a
GitHub Actions build-check but do not deploy.

## Prerequisites

- Node + npm; `fzf` (`brew install fzf`, optional — falls back to a text menu);
  `gh` CLI authed for the **HCWilde** account (remote uses the `github-hcw` SSH
  alias).

## One-time setup (manual)

1. **Netlify → Site config → Build & deploy → Continuous deployment → Branches
   and deploy contexts:** Production branch = `main`; Branch deploys = **None**;
   Deploy Previews = **None**.
2. **GitHub → repo Settings → General:** enable **Allow auto-merge**.
3. **GitHub → repo Settings → Branches → branch protection for `main`:** require
   status checks, select **build-check**. This is what `gh pr merge --auto`
   waits on.
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: build succeeds; all `build.test.mjs` tests PASS; all `hcw.test.sh` checks PASS; exit 0.

- [ ] **Step 3: Manual smoke (optional but recommended)**

Run: `npm run serve`, open `http://localhost:8080/`, click into Verses → the poem, Thoughts → the fragment, and a bad URL (404). Confirm styling, dark mode, and line breaks look right. Ctrl-C to stop.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "Rewrite README for Eleventy + hcw authoring workflow"
```

- [ ] **Step 5: Open the PR for the migration branch**

```bash
git push -u origin eleventy-migration
gh pr create --base main --head eleventy-migration \
  --title "Eleventy migration + hcw authoring workflow" \
  --body "Migrate to Eleventy (Markdown source, shared layout, auto indexes), two sections (Verses/Thoughts), Netlify main-only deploy, PR build-check, and the bin/hcw authoring CLI. See docs/superpowers/specs and plans."
```
Then complete the **One-time setup** steps above so the build-check + auto-merge gate works, and merge.

---

## Self-review notes

- **Spec coverage:** Eleventy migration (T1–T3), Markdown verses with preserved
  line breaks (T4), thoughts prose (T6), auto indexes (T5/T7), single-source
  nav/footer/landing via `site.json` (T2), 404 (T8), gallery removal (T9/T10),
  Netlify main-only + ignore guard (T11), PR build-check Action (T11), bash+fzf
  CLI with menu + subcommands + fzf fallback + `HCW_EDITOR` (T12–T15), publish
  build-check abort (T15), README + manual setup (T16). All spec sections mapped.
- **Verse raw-body risk:** primary path is `page.rawInput`; explicit fallback to
  `templateEngineOverride: false` + `content` documented in Task 4 Step 7.
- **Type/name consistency:** `slugify`, `menu`, `scaffold`, `write_piece`,
  `ensure_serve`, `choose_write`, `publish_piece` are defined once and referenced
  consistently; filters `roman`/`verses`/`year`/`ordinalOf`/`startsWith` and
  collections `verse`/`thought` named identically across config, layouts, indexes.
```
