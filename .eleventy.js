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

module.exports = function (eleventyConfig) {
  // ---- passthrough copy (assets emitted unchanged) ----
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/fonts": "fonts" });
  eleventyConfig.addPassthroughCopy({ "src/_headers": "_headers" });

  // ---- filters ----
  eleventyConfig.addFilter("startsWith", (s, p) => String(s).startsWith(p));
  eleventyConfig.addFilter("roman", romanize);
  eleventyConfig.addFilter("verses", versesToHtml);
  eleventyConfig.addFilter("year", (d) => new Date(d).getFullYear());
  eleventyConfig.addFilter("ordinalOf", (collection, url) => {
    const i = collection.findIndex((item) => item.url === url);
    return i < 0 ? 1 : i + 1;
  });

  eleventyConfig.addCollection("verse", (c) => c.getFilteredByTag("verse").sort(byOrder));
  eleventyConfig.addCollection("thought", (c) => c.getFilteredByTag("thought").sort(byOrder));

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    // content files are plain Markdown/HTML — no Nunjucks preprocessing of bodies
    markdownTemplateEngine: false,
    htmlTemplateEngine: "njk",
  };
};
