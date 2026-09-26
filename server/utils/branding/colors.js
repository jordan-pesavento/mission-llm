/**
 * Accent color math for instance branding.
 *
 * This file is self-contained on purpose: frontend/src/utils/branding/accent.js
 * runs the same algorithm, and both must return identical results for the same
 * inputs (the jest cases in server/__tests__/utils/branding/colors.test.js are
 * the reference vectors).
 *
 * Algorithm:
 * - Contrast is the WCAG 2 ratio of relative luminances (sRGB decode threshold 0.04045).
 * - Dark theme: start from the base accent and raise its OKLCH lightness in steps of
 *   0.01 (same hue, chroma reduced only as far as needed to stay inside sRGB) until
 *   its contrast is at least 3.0 against both dark surfaces. At most 100 steps.
 * - Light theme: start from the light override if set, else the base, and lower the
 *   lightness the same way until the contrast is at least 4.5 against both light
 *   surfaces (the light accent is also used as text).
 * - Button text: the button fill is color-mix(in srgb, accent 80%, #000), so each
 *   8-bit channel is multiplied by 0.8 (unrounded). The text is #ffffff or #0b1220,
 *   whichever contrasts more with that fill (a tie goes to #ffffff). `ratio` is that
 *   contrast rounded to one decimal.
 * - Readable buttons: when the better text still reaches less than 4.5:1 (unrounded)
 *   on the fill of a theme's accent, keep stepping its OKLCH lightness by 0.01:
 *   darker when #ffffff is the better text, lighter when #0b1220 is, until the text
 *   reaches 4.5:1 while the accent still meets that theme's surface floor. If that
 *   direction never gets there within 100 steps, try the other one; if neither
 *   does, keep the color. Only mid-tone dark theme accents are affected (a light
 *   theme accent that meets 4.5:1 against white always gives white text 4.5:1).
 * - `adjusted` is true when the theme's accent differs from its starting color.
 * - With no custom accent at all, the built-in theme values apply unchanged.
 */

const DEFAULT_ACCENT_DARK = "#4f86ff";
const DEFAULT_ACCENT_LIGHT = "#2458e6";
const DARK_SURFACES = ["#060a13", "#0b1322"];
const LIGHT_SURFACES = ["#f3f5f9", "#ffffff"];
const DARK_MIN_CONTRAST = 3.0;
const LIGHT_MIN_CONTRAST = 4.5;
const BUTTON_TEXT_MIN_CONTRAST = 4.5;
const ON_ACCENT_LIGHT = "#ffffff";
const ON_ACCENT_DARK = "#0b1220";
const BANNER_TEXT_LIGHT = "#ffffff";
const BANNER_TEXT_DARK = "#000000";
const L_STEP = 0.01;
const MAX_STEPS = 100;
const GAMUT_EPSILON = 1e-6;
const CHROMA_SEARCH_ITERATIONS = 30;

/**
 * Normalizes "#abc", "#AABBCC", "abc" or "aabbcc" to lowercase "#aabbcc".
 * @param {any} value
 * @returns {string|null} null when the value is not a 3 or 6 digit hex color
 */
function normalizeHex(value) {
  if (typeof value !== "string") return null;
  let hex = value.trim().toLowerCase();
  if (hex.startsWith("#")) hex = hex.slice(1);
  if (/^[0-9a-f]{3}$/.test(hex))
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  if (!/^[0-9a-f]{6}$/.test(hex)) return null;
  return `#${hex}`;
}

/** @returns {number[]} 8-bit channels [r, g, b] of a normalized hex color */
function hexToRgb(hex) {
  const clean = normalizeHex(hex);
  if (!clean) throw new Error(`Invalid hex color: ${hex}`);
  return [1, 3, 5].map((i) => parseInt(clean.slice(i, i + 2), 16));
}

function rgbToHex(rgb) {
  return `#${rgb
    .map((c) =>
      Math.max(0, Math.min(255, Math.round(c)))
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;
}

/** sRGB transfer function, decode (0..1 in, linear 0..1 out). */
function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** sRGB transfer function, encode (linear 0..1 in, 0..1 out). */
function linearToSrgb(c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/**
 * WCAG relative luminance of 8-bit channels (fractional channels allowed).
 * @param {number[]} rgb
 */
function luminanceOfRgb(rgb) {
  const [r, g, b] = rgb.map((c) => srgbToLinear(c / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastOfLuminance(a, b) {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG contrast ratio of two hex colors. */
function contrastRatio(hexA, hexB) {
  return contrastOfLuminance(
    luminanceOfRgb(hexToRgb(hexA)),
    luminanceOfRgb(hexToRgb(hexB))
  );
}

/** @returns {{L:number, C:number, h:number}} OKLCH, hue in radians */
function hexToOklch(hex) {
  const [r, g, b] = hexToRgb(hex).map((c) => srgbToLinear(c / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.sqrt(A * A + B * B), h: Math.atan2(B, A) };
}

/** @returns {number[]} linear sRGB channels (may fall outside 0..1) */
function oklchToLinear(L, C, h) {
  const A = C * Math.cos(h);
  const B = C * Math.sin(h);
  const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
  const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
  const s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function inGamut(linear) {
  return linear.every((c) => c >= -GAMUT_EPSILON && c <= 1 + GAMUT_EPSILON);
}

/**
 * OKLCH to hex. When the color is outside sRGB, the chroma is reduced (binary
 * search, fixed iteration count) to the largest in-gamut value at the same
 * lightness and hue.
 */
function oklchToHex(L, C, h) {
  const lightness = Math.max(0, Math.min(1, L));
  let chroma = Math.max(0, C);
  if (!inGamut(oklchToLinear(lightness, chroma, h))) {
    let lo = 0;
    let hi = chroma;
    for (let i = 0; i < CHROMA_SEARCH_ITERATIONS; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinear(lightness, mid, h))) lo = mid;
      else hi = mid;
    }
    chroma = lo;
  }
  const linear = oklchToLinear(lightness, chroma, h);
  return rgbToHex(
    linear.map((c) => linearToSrgb(Math.max(0, Math.min(1, c))) * 255)
  );
}

function meetsAll(hex, surfaces, minRatio) {
  return surfaces.every((surface) => contrastRatio(hex, surface) >= minRatio);
}

/**
 * Moves a color's OKLCH lightness in 0.01 steps (direction +1 lighter, -1 darker)
 * until it reaches `minRatio` against every surface.
 * @returns {{hex: string, adjusted: boolean}}
 */
function adjustForSurfaces(startHex, surfaces, minRatio, direction) {
  const start = normalizeHex(startHex);
  if (meetsAll(start, surfaces, minRatio))
    return { hex: start, adjusted: false };

  const { L, C, h } = hexToOklch(start);
  let hex = start;
  for (let step = 1; step <= MAX_STEPS; step++) {
    hex = oklchToHex(L + direction * L_STEP * step, C, h);
    if (meetsAll(hex, surfaces, minRatio)) break;
  }
  return { hex, adjusted: hex !== start };
}

/**
 * The better button text for an accent and its unrounded contrast with the
 * 80% fill (see the file header).
 * @returns {{useLight: boolean, contrast: number}}
 */
function buttonText(accentHex) {
  const fill = hexToRgb(accentHex).map((c) => c * 0.8);
  const fillLum = luminanceOfRgb(fill);
  const light = contrastOfLuminance(
    fillLum,
    luminanceOfRgb(hexToRgb(ON_ACCENT_LIGHT))
  );
  const dark = contrastOfLuminance(
    fillLum,
    luminanceOfRgb(hexToRgb(ON_ACCENT_DARK))
  );
  const useLight = light >= dark;
  return { useLight, contrast: useLight ? light : dark };
}

/**
 * Picks the button text color for an accent (see the file header).
 * @returns {{onAccent: string, ratio: number}}
 */
function onAccentFor(accentHex) {
  const { useLight, contrast } = buttonText(accentHex);
  return {
    onAccent: useLight ? ON_ACCENT_LIGHT : ON_ACCENT_DARK,
    ratio: Math.round(contrast * 10) / 10,
  };
}

/**
 * Moves an accent's OKLCH lightness in 0.01 steps until its button text
 * reaches 4.5:1 while the accent keeps `minRatio` against every surface
 * (see "Readable buttons" in the file header).
 * @returns {string} the accent, unchanged when its button text already passes
 */
function adjustForButtonText(startHex, surfaces, minRatio) {
  const start = normalizeHex(startHex);
  const first = buttonText(start);
  if (first.contrast >= BUTTON_TEXT_MIN_CONTRAST) return start;

  const { L, C, h } = hexToOklch(start);
  const preferred = first.useLight ? -1 : 1;
  for (const direction of [preferred, -preferred]) {
    for (let step = 1; step <= MAX_STEPS; step++) {
      const hex = oklchToHex(L + direction * L_STEP * step, C, h);
      if (
        buttonText(hex).contrast >= BUTTON_TEXT_MIN_CONTRAST &&
        meetsAll(hex, surfaces, minRatio)
      )
        return hex;
    }
  }
  return start;
}

/**
 * The effective accent for one theme: the surface floor first, then readable
 * button text.
 * @returns {{hex: string, adjusted: boolean}}
 */
function adjustForTheme(startHex, surfaces, minRatio, direction) {
  const start = normalizeHex(startHex);
  const surface = adjustForSurfaces(start, surfaces, minRatio, direction);
  const hex = adjustForButtonText(surface.hex, surfaces, minRatio);
  return { hex, adjusted: hex !== start };
}

function describeAccent(hex, adjusted) {
  const rgb = hexToRgb(hex);
  return {
    hex,
    rgb: rgb.join(" "),
    ...onAccentFor(hex),
    adjusted,
  };
}

/**
 * Computes the effective accent for both themes.
 * @param {string|null} base - brand_accent
 * @param {string|null} light - brand_accent_light (null means automatic)
 * @returns {{base: string|null, light: string|null, dark: object, lightTheme: object}}
 */
function computeAccent(base = null, light = null) {
  const baseHex = normalizeHex(base);
  const lightHex = normalizeHex(light);

  const dark = baseHex
    ? adjustForTheme(baseHex, DARK_SURFACES, DARK_MIN_CONTRAST, 1)
    : { hex: DEFAULT_ACCENT_DARK, adjusted: false };

  const lightStart = lightHex || baseHex;
  const lightTheme = lightStart
    ? adjustForTheme(lightStart, LIGHT_SURFACES, LIGHT_MIN_CONTRAST, -1)
    : { hex: DEFAULT_ACCENT_LIGHT, adjusted: false };

  return {
    base: baseHex,
    light: lightHex,
    dark: describeAccent(dark.hex, dark.adjusted),
    lightTheme: describeAccent(lightTheme.hex, lightTheme.adjusted),
  };
}

/**
 * The CSS that applies a custom accent, or "" when no custom accent is set.
 * Built only from validated channel numbers and hex, with no quotes, so it
 * survives HTML escaping and can be inlined in a <style> element.
 */
function accentCss(accent) {
  if (!accent || (!accent.base && !accent.light)) return "";
  const block = (a) => `--ml-accent-rgb:${a.rgb};--ml-on-accent:${a.onAccent}`;
  return `:root:root{${block(accent.dark)}}:root:root[data-theme=light]{${block(accent.lightTheme)}}`;
}

/** Banner text color: #ffffff or #000000, whichever contrasts more (tie: white). */
function bannerTextColor(bgHex) {
  const bg = normalizeHex(bgHex);
  if (!bg) return BANNER_TEXT_LIGHT;
  return contrastRatio(bg, BANNER_TEXT_LIGHT) >=
    contrastRatio(bg, BANNER_TEXT_DARK)
    ? BANNER_TEXT_LIGHT
    : BANNER_TEXT_DARK;
}

module.exports = {
  DEFAULT_ACCENT_DARK,
  DEFAULT_ACCENT_LIGHT,
  DARK_SURFACES,
  LIGHT_SURFACES,
  normalizeHex,
  hexToRgb,
  contrastRatio,
  hexToOklch,
  oklchToHex,
  adjustForSurfaces,
  onAccentFor,
  computeAccent,
  accentCss,
  bannerTextColor,
};
