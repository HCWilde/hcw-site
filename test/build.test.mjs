import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../_site/${p}`, import.meta.url), "utf8");
const has = (p) => existsSync(new URL(`../_site/${p}`, import.meta.url));

test("landing page builds with shared chrome", () => {
  assert.ok(has("index.html"), "_site/index.html exists");
  const html = read("index.html");
  assert.match(html, /class="[^"]*masthead/, "has shared header");
  assert.match(html, /href="\/verses\/"/, "nav links to verses");
  assert.match(html, /href="\/thoughts\/"/, "nav links to thoughts");
  assert.match(html, /quiet/, "renders hero heading");
});

test("css is passed through", () => {
  assert.ok(has("css/base.css"), "_site/css/base.css exists");
});

test("verse page preserves stanzas as verse paragraphs", () => {
  assert.ok(has("verses/sea/index.html"), "verse page built at pretty URL");
  const html = read("verses/sea/index.html");
  const stanzas = html.match(/<p class="verse">/g) || [];
  assert.equal(stanzas.length, 3, "three stanzas -> three verse paragraphs");
  assert.match(html, /poem · i/, "kicker shows kind + roman ordinal");
  assert.match(html, /All night the water practiced your name\n/, "line breaks preserved inside a stanza");
  assert.match(html, /poems\.css/, "links the reading stylesheet");
});

test("verses index lists pieces with roman ordinals", () => {
  assert.ok(has("verses/index.html"), "verses index built");
  const html = read("verses/index.html");
  assert.match(html, /The Sea Does Not Remember/, "lists the sample verse");
  assert.match(html, /href="\/verses\/sea\/"/, "links to the verse page");
  assert.match(html, /<span class="num">i<\/span>/, "first item numbered i");
});

test("thought page renders prose and blockquote", () => {
  assert.ok(has("thoughts/entropy/index.html"), "thought page built");
  const html = read("thoughts/entropy/index.html");
  assert.match(html, /class="prose"/, "wrapped in prose");
  assert.match(html, /<blockquote>/, "markdown > becomes blockquote");
  assert.match(html, /fragment · i/, "kicker shows fragment + roman");
  assert.match(html, /Order is not a state but a verb/, "renders body text");
});
