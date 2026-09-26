/**
 * SVG sanitizer for branding uploads.
 *
 * - A DOCTYPE with an internal subset ("[") is rejected (entity tricks); any other
 *   DOCTYPE and the XML declaration are stripped.
 * - A linear pre-scan rejects markup that is too deeply nested, has too many
 *   elements, or an element with too many attributes (SVG_LIMITS). DOMPurify
 *   on jsdom slows down sharply on such input and runs synchronously, so one
 *   small upload could otherwise stall every request on the server.
 * - DOMPurify (on jsdom) with the svg and svgFilters profiles, parsing as
 *   application/xhtml+xml so the document is read as XML. data-* attributes
 *   are dropped.
 * - Every href that is not a local reference (#id) or an embedded image
 *   (data:image/...) is dropped, so the file cannot load or link anything.
 * - A root with a viewBox but no width or height gets both from the viewBox,
 *   so the stored file has a natural size wherever it is shown.
 * - The result is serialized with XMLSerializer and rejected if empty.
 */

const { svgSizeFromElement } = require("./imageInfo");

// In XHTML mode DOMPurify matches names case-sensitively while its built-in
// SVG lists are lowercase, so the camelCase SVG names must be allowed
// explicitly or they would be stripped (viewBox, linearGradient, ...).
// Animation elements and attributes stay out on purpose.
const CAMEL_CASE_TAGS = [
  "clipPath",
  "linearGradient",
  "radialGradient",
  "textPath",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
];

const CAMEL_CASE_ATTRS = [
  "viewBox",
  "preserveAspectRatio",
  "clipPathUnits",
  "gradientUnits",
  "gradientTransform",
  "spreadMethod",
  "patternUnits",
  "patternContentUnits",
  "patternTransform",
  "maskUnits",
  "maskContentUnits",
  "markerWidth",
  "markerHeight",
  "markerUnits",
  "refX",
  "refY",
  "filterUnits",
  "primitiveUnits",
  "stdDeviation",
  "baseFrequency",
  "numOctaves",
  "stitchTiles",
  "kernelMatrix",
  "kernelUnitLength",
  "diffuseConstant",
  "specularConstant",
  "specularExponent",
  "surfaceScale",
  "tableValues",
  "targetX",
  "targetY",
  "xChannelSelector",
  "yChannelSelector",
  "edgeMode",
  "preserveAlpha",
  "pathLength",
  "startOffset",
  "textLength",
  "lengthAdjust",
  "systemLanguage",
];

// KEEP_CONTENT is off: a removed element is dropped with everything inside it.
// With it on, DOMPurify deep-clones the content of every removed element into
// its parent, so a few dozen nested unknown elements around a few thousand
// shapes grow into hundreds of thousands of nodes and can exhaust the heap.
// Content inside an element that is not allowed is never part of the drawing.
const PURIFY_CONFIG = {
  USE_PROFILES: { svg: true, svgFilters: true },
  PARSER_MEDIA_TYPE: "application/xhtml+xml",
  ALLOW_DATA_ATTR: false,
  KEEP_CONTENT: false,
  ADD_TAGS: CAMEL_CASE_TAGS,
  ADD_ATTR: CAMEL_CASE_ATTRS,
  FORBID_TAGS: ["foreignObject", "script", "iframe", "embed", "object"],
  RETURN_DOM: true,
};

// Real logos and icons stay far below these; the sanitizer's cost grows
// quickly past them.
const SVG_LIMITS = {
  chars: 512 * 1024,
  depth: 64,
  elements: 5000,
  attributes: 64,
  totalAttributes: 20000,
};

// An XML name made of ASCII characters only (optionally prefixed, a:b).
const ASCII_XML_NAME = /^[A-Za-z_][A-Za-z0-9_.:-]*$/;

/**
 * Linear scan of the raw markup (no parsing): false when a tag name is not a
 * plain ASCII XML name, an element is nested deeper than `limits.depth`, there
 * are more than `limits.elements` elements, one element has more than
 * `limits.attributes` attributes, all elements together have more than
 * `limits.totalAttributes`, the text is longer than `limits.chars`, a
 * processing instruction or declaration appears (the prolog is stripped
 * first), or a closing tag has nothing open. Every "<" that does not open a
 * comment or CDATA is read as a tag. Quoted values are skipped, and comments
 * and CDATA are not counted.
 * @param {string} text
 * @param {{depth: number, elements: number, attributes: number, totalAttributes: number}} limits
 * @returns {boolean}
 */
function withinSvgLimits(text, limits = SVG_LIMITS) {
  const length = text.length;
  if (length > limits.chars) return false;
  let depth = 0;
  let elements = 0;
  let totalAttributes = 0;
  let i = 0;
  while (i < length) {
    const lt = text.indexOf("<", i);
    if (lt === -1) break;
    const skipTo = (marker, from) => {
      const end = text.indexOf(marker, from);
      return end === -1 ? length : end + marker.length;
    };
    if (text.startsWith("<!--", lt)) {
      i = skipTo("-->", lt + 4);
      continue;
    }
    if (text.startsWith("<![CDATA[", lt)) {
      i = skipTo("]]>", lt + 9);
      continue;
    }
    // The XML declaration and a plain DOCTYPE are removed before this scan
    // (stripProlog). Any other processing instruction or declaration has no
    // place in a logo, and skipping one to its first ">" would let fake
    // closing tags hidden inside it throw off the depth count.
    const next = text[lt + 1];
    if (next === "?" || next === "!") return false;
    // Every other "<" starts a tag. Only plain ASCII names are accepted: real
    // SVG never uses anything else, and a name the scan could not read would
    // otherwise go uncounted (for example deeply nested <é> elements).
    const closing = next === "/";
    const nameStart = closing ? lt + 2 : lt + 1;
    let nameEnd = nameStart;
    while (nameEnd < length && !/[\s/>]/.test(text[nameEnd])) nameEnd++;
    if (!ASCII_XML_NAME.test(text.slice(nameStart, nameEnd))) return false;

    let attributes = 0;
    let quote = null;
    let j = nameEnd;
    for (; j < length; j++) {
      const c = text[j];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") quote = c;
      else if (c === "=") attributes++;
      else if (c === ">") break;
    }
    if (j >= length) break; // unterminated tag: the XML parser rejects it

    if (closing) {
      // A closing tag with nothing open is malformed; the parser would reject
      // it anyway, and counting it would let the depth limit be gamed.
      if (depth === 0) return false;
      depth--;
    } else {
      elements++;
      totalAttributes += attributes;
      if (
        elements > limits.elements ||
        attributes > limits.attributes ||
        totalAttributes > limits.totalAttributes
      )
        return false;
      if (text[j - 1] !== "/" && ++depth > limits.depth) return false;
    }
    i = j + 1;
  }
  return true;
}

let purifier = null;

function getPurifier() {
  if (purifier) return purifier;
  const createDOMPurify = require("dompurify");
  const { JSDOM } = require("jsdom");
  const { window } = new JSDOM("");
  purifier = { DOMPurify: createDOMPurify(window), window };
  return purifier;
}

function allowedHref(value = "") {
  const trimmed = String(value).trim().toLowerCase();
  return trimmed.startsWith("#") || trimmed.startsWith("data:image/");
}

/**
 * Removes the XML declaration and a DOCTYPE without an internal subset.
 * @returns {string|null} null when the DOCTYPE has an internal subset
 */
function stripProlog(text) {
  let output = text.replace(/^\uFEFF/, "");
  const doctypes = output.match(/<!DOCTYPE[^>]*>?/gi) || [];
  if (doctypes.some((doctype) => doctype.includes("["))) return null;
  if (/<!ENTITY/i.test(output)) return null;
  output = output.replace(/<\?xml[\s\S]*?\?>/gi, "");
  output = output.replace(/<!DOCTYPE[^>]*>/gi, "");
  return output.trim();
}

/**
 * Sanitizes SVG bytes.
 * @param {Buffer|string} input
 * @returns {{ok: true, svg: string, buffer: Buffer, width: number|null, height: number|null} | {ok: false, error: "invalid_svg"}}
 */
function sanitizeSvg(input) {
  try {
    const text = Buffer.isBuffer(input) ? input.toString("utf8") : input;
    if (typeof text !== "string" || !text.trim())
      return { ok: false, error: "invalid_svg" };

    const cleaned = stripProlog(text);
    if (!cleaned) return { ok: false, error: "invalid_svg" };
    if (!withinSvgLimits(cleaned)) return { ok: false, error: "invalid_svg" };

    const { DOMPurify, window } = getPurifier();
    const body = DOMPurify.sanitize(cleaned, PURIFY_CONFIG);
    const root = body?.firstElementChild;
    if (
      !root ||
      root.localName !== "svg" ||
      root.namespaceURI !== "http://www.w3.org/2000/svg" ||
      body.childElementCount !== 1
    )
      return { ok: false, error: "invalid_svg" };

    for (const element of [root, ...root.querySelectorAll("*")]) {
      for (const attribute of [...element.attributes]) {
        const name = attribute.localName.toLowerCase();
        if (name === "href" && !allowedHref(attribute.value))
          element.removeAttributeNode(attribute);
      }
    }

    // Nothing left to draw (for example a file that was only a script).
    if (root.childElementCount === 0 && !root.textContent.trim())
      return { ok: false, error: "invalid_svg" };

    // A viewBox-only SVG has no natural size, so an <img> of it can collapse
    // to nothing in a shrink-to-fit box. Give it the viewBox size.
    const size = svgSizeFromElement(root);
    if (size && !root.hasAttribute("width") && !root.hasAttribute("height")) {
      root.setAttribute("width", String(size.width));
      root.setAttribute("height", String(size.height));
    }

    const svg = new window.XMLSerializer().serializeToString(root).trim();
    if (!svg) return { ok: false, error: "invalid_svg" };

    return {
      ok: true,
      svg,
      buffer: Buffer.from(svg, "utf8"),
      width: size?.width ?? null,
      height: size?.height ?? null,
    };
  } catch (error) {
    console.error("[branding] SVG sanitize failed:", error.message);
    return { ok: false, error: "invalid_svg" };
  }
}

module.exports = { sanitizeSvg, allowedHref, withinSvgLimits, SVG_LIMITS };
