const { sanitizeSvg, withinSvgLimits } = require("../../../utils/branding/svg");

const NS = 'xmlns="http://www.w3.org/2000/svg"';

describe("sanitizeSvg", () => {
  it("removes script elements and event handlers", () => {
    const result = sanitizeSvg(
      `<svg ${NS} viewBox="0 0 100 20" onload="alert(1)"><script>alert(2)</script><rect width="10" height="10" onclick="alert(3)"/></svg>`
    );
    expect(result.ok).toBe(true);
    expect(result.svg).not.toMatch(/script|onload|onclick|alert/i);
    expect(result.svg).toContain("<rect");
  });

  it("drops javascript: and external hrefs but keeps local and embedded images", () => {
    const result = sanitizeSvg(
      `<svg ${NS} xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10 10">` +
        `<a href="javascript:alert(1)"><text>a</text></a>` +
        `<a xlink:href="javascript:alert(2)"><text>b</text></a>` +
        `<image href="https://example.com/track.png" width="1" height="1"/>` +
        `<image href="data:image/png;base64,iVBORw0KGgo=" width="1" height="1"/>` +
        `<rect id="r" width="1" height="1" fill="url(#g)"/>` +
        `</svg>`
    );
    expect(result.ok).toBe(true);
    expect(result.svg).not.toMatch(/javascript:/i);
    expect(result.svg).not.toContain("example.com");
    expect(result.svg).toContain('href="data:image/png;base64,iVBORw0KGgo="');
    expect(result.svg).toContain("url(#g)");
  });

  it("strips a plain DOCTYPE and the XML declaration", () => {
    const result = sanitizeSvg(
      `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n<svg ${NS} viewBox="0 0 40 10"><rect width="40" height="10"/></svg>`
    );
    expect(result.ok).toBe(true);
    expect(result.svg).not.toMatch(/DOCTYPE|<\?xml/);
    expect(result).toMatchObject({ width: 40, height: 10 });
  });

  it("rejects a DOCTYPE with an internal subset (entities)", () => {
    const result = sanitizeSvg(
      `<!DOCTYPE svg [ <!ENTITY boom "boom"> ]><svg ${NS} viewBox="0 0 1 1"><text>&boom;</text></svg>`
    );
    expect(result).toEqual({ ok: false, error: "invalid_svg" });
  });

  it("keeps camelCase SVG names (viewBox, gradients, filters)", () => {
    const result = sanitizeSvg(
      `<svg ${NS} viewBox="0 0 100 20" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="g" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="red"/></linearGradient><clipPath id="c"><rect width="5" height="5"/></clipPath><filter id="f"><feGaussianBlur stdDeviation="2"/></filter></defs><rect width="100" height="20" fill="url(#g)" clip-path="url(#c)" filter="url(#f)"/></svg>`
    );
    expect(result.ok).toBe(true);
    for (const name of [
      'viewBox="0 0 100 20"',
      "preserveAspectRatio",
      "<linearGradient",
      "gradientUnits",
      "<clipPath",
      "<feGaussianBlur",
      "stdDeviation",
    ])
      expect(result.svg).toContain(name);
    expect(result).toMatchObject({ width: 100, height: 20 });
  });

  it("removes foreignObject, use and animation elements", () => {
    const result = sanitizeSvg(
      `<svg ${NS} viewBox="0 0 10 10"><foreignObject><div xmlns="http://www.w3.org/1999/xhtml">x</div></foreignObject><use href="#r"/><animate attributeName="href" to="javascript:alert(1)"/><rect id="r" width="1" height="1"/></svg>`
    );
    expect(result.ok).toBe(true);
    expect(result.svg).not.toMatch(/foreignObject|<use|<animate|<div/);
  });

  it("reads the size from width and height when there is no viewBox", () => {
    expect(
      sanitizeSvg(
        `<svg ${NS} width="120px" height="30"><rect width="1" height="1"/></svg>`
      )
    ).toMatchObject({ ok: true, width: 120, height: 30 });
  });

  it("rejects files that are empty after sanitizing or are not SVG", () => {
    for (const input of [
      `<svg ${NS} viewBox="0 0 1 1"><script>alert(1)</script></svg>`,
      `<svg ${NS} viewBox="0 0 1 1"/>`,
      `<svg viewBox="0 0 1 1"><rect/></svg>`, // no SVG namespace
      `<svg ${NS}><rect></svg>`, // malformed XML
      `<html><body><script>alert(1)</script></body></html>`,
      "",
      Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    ])
      expect(sanitizeSvg(input)).toEqual({ ok: false, error: "invalid_svg" });
  });

  it("gives a viewBox-only SVG the viewBox size as width and height", () => {
    const result = sanitizeSvg(
      `<svg ${NS} viewBox="0 0 300 75"><rect width="300" height="75"/></svg>`
    );
    expect(result.ok).toBe(true);
    expect(result.svg).toMatch(/^<svg [^>]*width="300"/);
    expect(result.svg).toMatch(/^<svg [^>]*height="75"/);
    expect(result).toMatchObject({ width: 300, height: 75 });
    // An explicit size is left as it is.
    const sized = sanitizeSvg(
      `<svg ${NS} viewBox="0 0 300 75" width="120"><rect width="1" height="1"/></svg>`
    );
    expect(sized.svg).toContain('width="120"');
    expect(sized.svg).not.toContain('height="75"');
  });

  it("drops data-* attributes", () => {
    const result = sanitizeSvg(
      `<svg ${NS} viewBox="0 0 10 10"><rect width="1" height="1" data-x="1" data-track="y"/></svg>`
    );
    expect(result.ok).toBe(true);
    expect(result.svg).not.toContain("data-");
  });

  it("rejects overly complex markup quickly, before parsing", () => {
    const deep = (n) =>
      `<svg ${NS} viewBox="0 0 1 1">${"<g>".repeat(n)}<rect width="1" height="1"/>${"</g>".repeat(n)}</svg>`;
    const attrs = (n) =>
      Array.from({ length: n }, (_, i) => `data-a${i}="x"`).join(" ");
    const cases = [
      deep(5000), // nesting
      deep(250000),
      `<svg ${NS} viewBox="0 0 1 1"><rect width="1" height="1" ${attrs(60000)}/></svg>`, // attributes on one element
      `<svg ${NS} viewBox="0 0 1 1">${'<rect width="1" height="1"/>'.repeat(5001)}</svg>`, // element count
      `<svg ${NS} viewBox="0 0 1 1">${`<rect ${attrs(40)}/>`.repeat(600)}</svg>`, // attributes in total
    ];
    for (const input of cases) {
      const start = Date.now();
      expect(sanitizeSvg(input)).toEqual({ ok: false, error: "invalid_svg" });
      expect(Date.now() - start).toBeLessThan(200);
    }
    // Within the limits: nesting and a normal attribute count still pass.
    expect(sanitizeSvg(deep(60)).ok).toBe(true);
    // 64 levels in all, counting the <svg> root.
    expect(withinSvgLimits(deep(63))).toBe(true);
    expect(withinSvgLimits(deep(64))).toBe(false);
  });

  it("counts every tag, and rejects tag names that are not plain ASCII", () => {
    const nest = (name, n) =>
      `<svg ${NS} viewBox="0 0 1 1">${`<${name}>`.repeat(n)}<rect width="1" height="1"/>${`</${name}>`.repeat(n)}</svg>`;
    for (const input of [
      nest("é", 2), // shallow, but a non-ASCII name
      nest("é", 600),
      nest("é", 2500),
      nest("中", 1000),
      nest("_x", 100), // ASCII but too deep
      `<svg ${NS} viewBox="0 0 1 1">< g><rect width="1" height="1"/></ g></svg>`,
    ]) {
      const start = Date.now();
      expect(withinSvgLimits(input)).toBe(false);
      expect(sanitizeSvg(input)).toEqual({ ok: false, error: "invalid_svg" });
      expect(Date.now() - start).toBeLessThan(200);
    }
    expect(withinSvgLimits(nest("svg:g", 10))).toBe(true);
  });

  it("stays fast when unknown elements wrap many shapes", () => {
    sanitizeSvg(
      `<svg ${NS} viewBox="0 0 1 1"><rect width="1" height="1"/></svg>`
    ); // warm up jsdom
    const wrapped = (name, depth, shapes) =>
      `<svg ${NS} viewBox="0 0 1 1">${`<${name}>`.repeat(depth)}${'<rect width="1" height="1"/>'.repeat(shapes)}${`</${name}>`.repeat(depth)}</svg>`;
    // Inside the pre-scan limits: this used to deep-clone the shapes once per
    // unknown level (over a gigabyte of heap).
    const start = Date.now();
    expect(sanitizeSvg(wrapped("foo", 62, 4900))).toEqual({
      ok: false,
      error: "invalid_svg",
    });
    expect(Date.now() - start).toBeLessThan(2000);
  });

  it("drops the content of elements that are not allowed", () => {
    const result = sanitizeSvg(
      `<svg ${NS} viewBox="0 0 10 10"><metadata-x><rect id="hidden" width="1" height="1"/></metadata-x><rect id="kept" width="1" height="1"/></svg>`
    );
    expect(result.ok).toBe(true);
    expect(result.svg).toContain('id="kept"');
    expect(result.svg).not.toContain("hidden");
  });

  it("does not count markup inside comments, CDATA or quoted values", () => {
    expect(
      withinSvgLimits(
        `<svg ${NS}><!-- ${"<g>".repeat(100)} --><style><![CDATA[${"<g>".repeat(100)}]]></style><text title="${"<g>".repeat(100)}">a > b</text></svg>`
      )
    ).toBe(true);
  });

  it("rejects processing instructions, declarations and stray closing tags that could fool the depth count", () => {
    // Fake closing tags hidden in a processing instruction used to reset the
    // depth counter, so thousands of nested levels reached the parser.
    const fake = `<?pi ${"</g>".repeat(60)} ?>`;
    const exploit = `<svg ${NS} viewBox="0 0 1 1">${`${"<g>".repeat(60)}${fake}`.repeat(40)}<rect width="1" height="1"/>${"</g>".repeat(2400)}</svg>`;
    for (const input of [
      exploit,
      `<svg ${NS} viewBox="0 0 1 1"><!ELEMENT g ANY><rect width="1" height="1"/></svg>`,
      `<svg ${NS} viewBox="0 0 1 1"><?php echo 1 ?><rect width="1" height="1"/></svg>`,
      `<svg ${NS} viewBox="0 0 1 1"></g></g><rect width="1" height="1"/></svg>`,
      `<svg ${NS} viewBox="0 0 1 1">${" ".repeat(600 * 1024)}<rect width="1" height="1"/></svg>`,
    ]) {
      const start = Date.now();
      expect(withinSvgLimits(input)).toBe(false);
      expect(sanitizeSvg(input)).toEqual({ ok: false, error: "invalid_svg" });
      expect(Date.now() - start).toBeLessThan(200);
    }
    // The XML declaration and a plain DOCTYPE are still accepted (stripped first).
    expect(
      sanitizeSvg(
        `<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg ${NS} viewBox="0 0 1 1"><rect width="1" height="1"/></svg>`
      ).ok
    ).toBe(true);
  });

  it("is stable: sanitizing its own output gives the same bytes", () => {
    const first = sanitizeSvg(
      `<svg ${NS} viewBox="0 0 100 20"><rect width="100" height="20" fill="#123456"/></svg>`
    );
    const second = sanitizeSvg(first.buffer);
    expect(second.svg).toBe(first.svg);
  });
});
