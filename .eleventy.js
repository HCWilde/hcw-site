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
