# HCW — collected works

A handmade static site: poems, images, philosophical fragments. No build step,
no framework, no JavaScript required. Just HTML + CSS, served straight off
Cloudflare Pages.

## Structure

```
hcw-site/
  index.html            landing / index of realms
  poems/
    index.html          list of poems
    sea.html            example poem
  thoughts/
    index.html          list of fragments
    entropy.html        example fragment
  gallery.html          image grid + CSS-only lightbox
  404.html              custom not-found page
  css/
    base.css            design system (tokens, header/footer, landing, gallery)
    poems.css           long-form reading layout (poems + thoughts)
  images/               your photographs
  fonts/                self-hosted fonts (optional)
  scripts/              optional JS (currently none)
  _headers              Cloudflare caching + security headers
```

## Editing

- **Re-skin everything:** change the CSS variables at the top of `css/base.css`
  (`--paper`, `--ink`, `--rust`, fonts). Dark mode is automatic via
  `prefers-color-scheme`.
- **Add a poem:** copy `poems/sea.html` to a new file, write your verse (one
  `<p class="verse">` per stanza — line breaks are preserved), then add a
  `<li class="realm">` entry in `poems/index.html`.
- **Add a thought:** same, using `thoughts/entropy.html` as the template.
- **Add an image:** drop the file in `images/`, then in `gallery.html` point a
  thumbnail and its matching `#img-N` lightbox at it.
- **Shared header/footer** are copy-pasted into every page (marked with
  `<!-- ===== SHARED HEADER ===== -->`). Edit one, mirror to the rest.

## Local preview

No build needed. Any static server works:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy (Cloudflare Pages)

Connect this repo in the Cloudflare dashboard → Workers & Pages → Create →
Pages → Connect to Git. Build settings:

- **Framework preset:** None
- **Build command:** *(leave empty)*
- **Build output directory:** `/`

Every push to the default branch redeploys.
