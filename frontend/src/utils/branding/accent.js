/**
 * Accent color math shared by the branding runtime and the Branding settings
 * page. Mirrors server/utils/branding/colors.js exactly: same inputs must give
 * the same hex values, text colors and ratios, so a draft preview looks the
 * same as the saved result.
 *
 * Pure functions only (no DOM), so it also runs under Node for the parity
 * check against the server copy.
 *
 * Algorithm (see the branding brief):
 * - Contrast is WCAG 2 relative luminance and contrast ratio.
 * - Dark theme: start from the base and lighten in OKLCH L steps of 0.01 (same
 *   hue, chroma reduced until the color fits in sRGB) until the contrast is at
 *   least 3.0 against both dark surfaces. At most 100 steps.
 * - Light theme: start from the light override, else the base, and darken the
 *   same way until the contrast is at least 4.5 against both light surfaces.
 * - Button text: the button fill is color-mix(in srgb, accent 80%, #000). The
 *   fill is computed in sRGB (each 8-bit channel times 0.8, unrounded), then
 *   the text is #ffffff or #0b1220, whichever contrasts more with the fill (a
 *   tie goes to #ffffff). `ratio` is that contrast rounded to one decimal.
 * - Readable buttons: when the better text still reaches less than 4.5:1
 *   (unrounded) on the fill of a theme's accent, keep stepping its OKLCH
 *   lightness by 0.01: darker when #ffffff is the better text, lighter when
 *   #0b1220 is, until the text reaches 4.5:1 while the accent still meets that
 *   theme's surface floor. If that direction never gets there within 100
 *   steps, try the other one; if neither does, keep the color.
 * - `adjusted` is true when the theme's accent differs from its starting color.
 * - Banner text: #ffffff or #000000, whichever contrasts more (tie: white).
 * - No custom accent: today's defaults (#4f86ff dark, #2458e6 light) and no css.
 */

export const DEFAULT_ACCENT_DARK = "#4f86ff";
export const DEFAULT_ACCENT_LIGHT = "#2458e6";

/** Ground and panel surfaces per theme (index.css --ml-ground / --ml-panel). */
export const ACCENT_SURFACES = {
  dark: ["#060a13", "#0b1322"],
  light: ["#f3f5f9", "#ffffff"],
};

export const DARK_MIN_CONTRAST = 3.0;
export const LIGHT_MIN_CONTRAST = 4.5;
/** Below this the settings badge uses its fail style. */
export const AA_TEXT_CONTRAST = 4.5;

export const TEXT_ON_DARK_FILL = "#ffffff";
export const TEXT_ON_LIGHT_FILL = "#0b1220";
export const BANNER_TEXT_LIGHT = "#ffffff";
export const BANNER_TEXT_DARK = "#000000";

const L_STEP = 0.01;
const MAX_STEPS = 100;
const FILL_MIX = 0.8;
const GAMUT_EPSILON = 1e-6;
const CHROMA_SEARCH_ITERATIONS = 30;

/**
 * Normalizes a hex color to lowercase #rrggbb. Accepts 3 or 6 digits with or
 * without the leading #. Returns null for anything else.
 * @param {unknown} value
 * @returns {string|null}
 */
export function normalizeHex(value) {
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

/**
 * @param {string} hex normalized #rrggbb
 * @returns {[number, number, number]} 8-bit channels
 */
export function hexToRgb(hex) {
  const h = normalizeHex(hex);
  if (!h) throw new Error(`Invalid hex color: ${hex}`);
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
}

/**
 * @param {number[]} rgb 8-bit channels (clamped and rounded)
 * @returns {string} #rrggbb
 */
export function rgbToHex(rgb) {
  return (
    "#" +
    rgb
      .map((c) =>
        Math.min(255, Math.max(0, Math.round(c)))
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}

/** "R G B" channel string used by --ml-accent-rgb. */
export function rgbChannels(hex) {
  return hexToRgb(hex).join(" ");
}

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

/** WCAG relative luminance of 8-bit channels (fractional channels allowed). */
function luminanceOfRgb(rgb) {
  const [r, g, b] = rgb.map((c) => srgbToLinear(c / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastOfLuminance(a, b) {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * WCAG 2 relative luminance of a hex color.
 * @param {string} hex
 * @returns {number}
 */
export function relativeLuminance(hex) {
  return luminanceOfRgb(hexToRgb(hex));
}

/**
 * WCAG 2 contrast ratio between two hex colors (unrounded).
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function contrastRatio(a, b) {
  return contrastOfLuminance(relativeLuminance(a), relativeLuminance(b));
}

/** Contrast rounded to one decimal, as shown in the UI and the brand payload. */
export function roundRatio(ratio) {
  return Math.round(ratio * 10) / 10;
}

function linearRgbToOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToLinearRgb([L, a, b]) {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/**
 * @param {string} hex
 * @returns {{l: number, c: number, h: number}} OKLCH with hue in radians
 */
export function hexToOklch(hex) {
  const lin = hexToRgb(hex).map((c) => srgbToLinear(c / 255));
  const [L, a, b] = linearRgbToOklab(lin);
  return { l: L, c: Math.hypot(a, b), h: Math.atan2(b, a) };
}

function oklchToLinear(l, c, h) {
  return oklabToLinearRgb([l, c * Math.cos(h), c * Math.sin(h)]);
}

function inGamut(lin) {
  return lin.every((v) => v >= -GAMUT_EPSILON && v <= 1 + GAMUT_EPSILON);
}

/**
 * OKLCH to hex. Keeps lightness and hue; when the color falls outside sRGB the
 * chroma is reduced (binary search) to the largest value that fits.
 * @param {number} l lightness, clamped to 0..1
 * @param {number} c chroma
 * @param {number} h hue in radians
 * @returns {string} #rrggbb
 */
export function oklchToHex(l, c, h) {
  const L = clamp01(l);
  const C = Math.max(0, c);
  let lin = oklchToLinear(L, C, h);
  if (!inGamut(lin)) {
    let lo = 0;
    let hi = C;
    for (let i = 0; i < CHROMA_SEARCH_ITERATIONS; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinear(L, mid, h))) lo = mid;
      else hi = mid;
    }
    lin = oklchToLinear(L, lo, h);
  }
  return rgbToHex(lin.map((v) => clamp01(linearToSrgb(clamp01(v))) * 255));
}

function minContrast(hex, surfaces) {
  return Math.min(...surfaces.map((s) => contrastRatio(hex, s)));
}

/**
 * Steps an accent's OKLCH lightness until its button text reaches AA while the
 * accent keeps `target` against every surface ("Readable buttons" above).
 * @param {string} start normalized hex
 * @param {string[]} surfaces
 * @param {number} target
 * @returns {string} the accent, unchanged when its button text already passes
 */
function adjustForButtonText(start, surfaces, target) {
  const first = buttonText(start);
  if (first.ratio >= AA_TEXT_CONTRAST) return start;
  const { l, c, h } = hexToOklch(start);
  const preferred = first.color === TEXT_ON_DARK_FILL ? -1 : 1;
  for (const direction of [preferred, -preferred]) {
    for (let step = 1; step <= MAX_STEPS; step++) {
      const hex = oklchToHex(l + direction * L_STEP * step, c, h);
      if (
        buttonText(hex).ratio >= AA_TEXT_CONTRAST &&
        minContrast(hex, surfaces) >= target
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
function adjustForTheme(start, surfaces, target, direction) {
  const surface = adjustForSurfaces(start, surfaces, target, direction);
  const hex = adjustForButtonText(surface.hex, surfaces, target);
  return { hex, adjusted: hex !== start };
}

/**
 * Steps OKLCH lightness until the color reaches `target` contrast against
 * every surface. The start color is returned untouched when it already passes.
 * @param {string} start normalized hex
 * @param {string[]} surfaces
 * @param {number} target
 * @param {1|-1} direction +1 lightens, -1 darkens
 * @returns {{hex: string, adjusted: boolean}}
 */
function adjustForSurfaces(start, surfaces, target, direction) {
  if (minContrast(start, surfaces) >= target)
    return { hex: start, adjusted: false };
  const { l, c, h } = hexToOklch(start);
  let hex = start;
  for (let step = 1; step <= MAX_STEPS; step++) {
    hex = oklchToHex(l + direction * L_STEP * step, c, h);
    if (minContrast(hex, surfaces) >= target) break;
  }
  return { hex, adjusted: hex !== start };
}

/**
 * color-mix(in srgb, a <weight>, b) as an 8-bit hex.
 * @param {string} a
 * @param {string} b
 * @param {number} weight share of `a`, 0..1
 * @returns {string}
 */
export function mixHex(a, b, weight) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(ca.map((c, i) => c * weight + cb[i] * (1 - weight)));
}

/**
 * The accent-colored button fill, color-mix(in srgb, accent 80%, #000), as an
 * 8-bit hex for display. Contrast math uses the unrounded fill instead.
 * @param {string} hex
 * @returns {string}
 */
export function accentFill(hex) {
  return rgbToHex(hexToRgb(hex).map((c) => c * FILL_MIX));
}

/**
 * Picks the lighter or darker text color for a background by contrast (the
 * light one wins a tie).
 * @param {number[]} rgb background channels, fractional allowed
 * @returns {{color: string, ratio: number}} ratio unrounded
 */
function pickText(rgb, light, dark) {
  const bg = luminanceOfRgb(rgb);
  const lightRatio = contrastOfLuminance(bg, relativeLuminance(light));
  const darkRatio = contrastOfLuminance(bg, relativeLuminance(dark));
  return lightRatio >= darkRatio
    ? { color: light, ratio: lightRatio }
    : { color: dark, ratio: darkRatio };
}

/**
 * Text color for a solid background: #ffffff or #0b1220, whichever contrasts
 * more (white wins a tie).
 * @param {string} background hex
 * @returns {{color: string, ratio: number}} ratio unrounded
 */
export function readableTextOn(background) {
  return pickText(hexToRgb(background), TEXT_ON_DARK_FILL, TEXT_ON_LIGHT_FILL);
}

/**
 * Better button text for an accent, against the unrounded 80% fill.
 * @param {string} hex
 * @returns {{color: string, ratio: number}} ratio unrounded
 */
function buttonText(hex) {
  const fill = hexToRgb(hex).map((c) => c * FILL_MIX);
  return pickText(fill, TEXT_ON_DARK_FILL, TEXT_ON_LIGHT_FILL);
}

/**
 * Button text for an accent, against the unrounded 80% fill.
 * @param {string} hex
 * @returns {{onAccent: string, ratio: number}} ratio rounded to 1 decimal
 */
export function onAccentFor(hex) {
  const { color, ratio } = buttonText(hex);
  return { onAccent: color, ratio: roundRatio(ratio) };
}

function describe({ hex, adjusted }) {
  const { onAccent, ratio } = onAccentFor(hex);
  return { hex, rgb: rgbChannels(hex), onAccent, ratio, adjusted };
}

/**
 * Effective accent for both themes, in the PublicBrand `accent` shape.
 * @param {{base?: string|null, light?: string|null}} input raw stored values
 * @returns {{base: string|null, light: string|null,
 *   dark: {hex: string, rgb: string, onAccent: string, ratio: number, adjusted: boolean},
 *   lightTheme: {hex: string, rgb: string, onAccent: string, ratio: number, adjusted: boolean}}}
 */
export function computeAccent({ base = null, light = null } = {}) {
  const b = normalizeHex(base);
  const l = normalizeHex(light);
  const dark = describe(
    adjustForTheme(
      b || DEFAULT_ACCENT_DARK,
      ACCENT_SURFACES.dark,
      DARK_MIN_CONTRAST,
      1
    )
  );
  const lightTheme = describe(
    adjustForTheme(
      l || b || DEFAULT_ACCENT_LIGHT,
      ACCENT_SURFACES.light,
      LIGHT_MIN_CONTRAST,
      -1
    )
  );
  return { base: b, light: l, dark, lightTheme };
}

/**
 * The accent override stylesheet. Empty when no custom accent is set, so the
 * index.css defaults apply unchanged. Built only from validated channels and
 * hex, with no quotes.
 * @param {ReturnType<typeof computeAccent>} accent
 * @returns {string}
 */
export function buildAccentCss(accent) {
  if (!accent || (!accent.base && !accent.light)) return "";
  const d = accent.dark;
  const lt = accent.lightTheme;
  if (!isAccentPart(d) || !isAccentPart(lt)) return "";
  return (
    `:root:root{--ml-accent-rgb:${d.rgb};--ml-on-accent:${d.onAccent}}` +
    `:root:root[data-theme=light]{--ml-accent-rgb:${lt.rgb};--ml-on-accent:${lt.onAccent}}`
  );
}

function isAccentPart(part) {
  return (
    !!part &&
    /^\d{1,3} \d{1,3} \d{1,3}$/.test(part.rgb) &&
    /^#[0-9a-f]{6}$/.test(part.onAccent)
  );
}

const CHANNELS =
  "(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d) (?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d) (?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
const SAFE_BRAND_CSS = new RegExp(
  `^:root:root\\{--ml-accent-rgb:${CHANNELS};--ml-on-accent:#[0-9a-f]{6}\\}` +
    `:root:root\\[data-theme=light\\]\\{--ml-accent-rgb:${CHANNELS};--ml-on-accent:#[0-9a-f]{6}\\}$`
);

/**
 * Allowlist for the server-built brand css. Only the exact accent override
 * shape (or an empty string) is ever injected into the page.
 * @param {unknown} css
 * @returns {boolean}
 */
export function isSafeBrandCss(css) {
  if (css === "" || css === null || css === undefined) return true;
  return typeof css === "string" && SAFE_BRAND_CSS.test(css);
}

/**
 * Settings badge text, for example "AA 5.0:1 · light text".
 * @param {{onAccent: string, ratio: number}} part
 * @returns {{label: string, pass: boolean}}
 */
export function contrastBadge(part) {
  const pass = part.ratio >= AA_TEXT_CONTRAST;
  const tone = part.onAccent === TEXT_ON_DARK_FILL ? "light" : "dark";
  return {
    label: `${pass ? "AA" : "Fail"} ${part.ratio.toFixed(1)}:1 · ${tone} text`,
    pass,
  };
}

/**
 * System banner text color: #ffffff or #000000, whichever contrasts more with
 * the background (tie: white).
 * @param {string} background
 * @returns {string}
 */
export function bannerForeground(background) {
  const bg = normalizeHex(background);
  if (!bg) return BANNER_TEXT_LIGHT;
  return pickText(hexToRgb(bg), BANNER_TEXT_LIGHT, BANNER_TEXT_DARK).color;
}
