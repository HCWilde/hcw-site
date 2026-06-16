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
