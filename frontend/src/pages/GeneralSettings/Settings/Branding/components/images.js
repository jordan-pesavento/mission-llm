/**
 * Client-side checks for branding uploads (the server is authoritative and
 * repeats every check) and the canvas step that turns one square icon into the
 * PNG sizes the browser tab, home screen and install prompts use.
 */

export const ICON_VARIANT_SIZES = [32, 180, 192, 512];
export const ACCEPTED_IMAGE_TYPES =
  "image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg";

const MB = 1024 * 1024;
const KB = 1024;
const DEFAULT_VARIANT_MAX_BYTES = 256 * KB;

// Documented limits, used until GET /admin/branding returns its own.
const DEFAULT_LIMITS = {
  logo: {
    maxBytes: 2 * MB,
    minWidth: 64,
    maxWidth: 4096,
    minHeight: 16,
    maxHeight: 4096,
    minAspect: 1,
    maxAspect: 12,
  },
  icon: {
    maxBytes: 2 * MB,
    minSize: 192,
    maxSize: 4096,
    squareTolerance: 0.02,
  },
};

function firstNumber(...candidates) {
  for (const value of candidates) {
    const n = Number(value);
    if (value !== null && value !== undefined && Number.isFinite(n)) return n;
  }
  return undefined;
}

/**
 * Reads the limits for one upload slot from the server's SLOT_CONFIG, falling
 * back to the documented values for anything it does not state.
 * @param {object} limits - `limits` from GET /admin/branding
 * @param {"logo-dark"|"logo-light"|"icon"} slot
 */
export function slotLimits(limits = {}, slot) {
  const kind = slot === "icon" ? "icon" : "logo";
  const base = DEFAULT_LIMITS[kind];
  const cfg =
    limits?.[slot] ||
    limits?.[kind === "icon" ? "icon-source" : slot] ||
    limits?.[kind] ||
    {};
  const dims = cfg.dimensions || cfg.dims || cfg;
  if (kind === "icon") {
    return {
      maxBytes:
        firstNumber(cfg.maxBytes, cfg.maxSize, cfg.max_bytes) ?? base.maxBytes,
      minSize:
        firstNumber(dims.minSize, dims.min, dims.minWidth) ?? base.minSize,
      maxSize:
        firstNumber(dims.maxSize, dims.max, dims.maxWidth) ?? base.maxSize,
      squareTolerance:
        firstNumber(
          dims.squareTolerance,
          dims.tolerance,
          cfg.squareTolerance
        ) ?? base.squareTolerance,
    };
  }
  return {
    maxBytes:
      firstNumber(cfg.maxBytes, cfg.maxSize, cfg.max_bytes) ?? base.maxBytes,
    minWidth: firstNumber(dims.minWidth, dims.minW) ?? base.minWidth,
    maxWidth: firstNumber(dims.maxWidth, dims.maxW) ?? base.maxWidth,
    minHeight: firstNumber(dims.minHeight, dims.minH) ?? base.minHeight,
    maxHeight: firstNumber(dims.maxHeight, dims.maxH) ?? base.maxHeight,
    minAspect: firstNumber(dims.minAspect, dims.aspectMin) ?? base.minAspect,
    maxAspect: firstNumber(dims.maxAspect, dims.aspectMax) ?? base.maxAspect,
  };
}

/**
 * Largest size the server accepts for one generated icon PNG (SLOT_CONFIG
 * icon.variants["icon-<size>"].maxBytes).
 * @param {object} limits - `limits` from GET /admin/branding
 * @param {number} size
 * @returns {number}
 */
export function variantMaxBytes(limits = {}, size) {
  return (
    firstNumber(limits?.icon?.variants?.[`icon-${size}`]?.maxBytes) ??
    DEFAULT_VARIANT_MAX_BYTES
  );
}

/**
 * The first generated icon PNG that is over the server's limit, or null.
 * A detailed photo can compress poorly at 512 px.
 * @param {Record<number, Blob>} variants - from makeIconVariants
 * @param {object} limits - `limits` from GET /admin/branding
 * @returns {number|null} the size in pixels
 */
export function oversizedVariant(variants, limits) {
  return (
    ICON_VARIANT_SIZES.find(
      (size) => variants[size]?.size > variantMaxBytes(limits, size)
    ) ?? null
  );
}

// File type from the first bytes, like the server. Returns png|jpeg|webp|svg|null.
async function sniffType(file) {
  const head = new Uint8Array(await file.slice(0, 512).arrayBuffer());
  const at = (i, bytes) => bytes.every((b, j) => head[i + j] === b);
  if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (at(0, [0xff, 0xd8, 0xff])) return "jpeg";
  if (at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50]))
    return "webp";
  const text = new TextDecoder("utf-8", { fatal: false })
    .decode(head)
    .trimStart();
  if (text.startsWith("<") && /<svg[\s>]/i.test(text)) return "svg";
  return null;
}

function parseLength(value) {
  if (!value) return null;
  const match = String(value)
    .trim()
    .match(/^([0-9.]+)(px)?$/i);
  return match ? parseFloat(match[1]) : null;
}

// Intrinsic size of an SVG from its width/height, else its viewBox.
async function svgSize(file) {
  try {
    const doc = new DOMParser().parseFromString(
      await file.text(),
      "image/svg+xml"
    );
    const svg = doc.documentElement;
    if (!svg || svg.nodeName.toLowerCase() !== "svg") return null;
    const width = parseLength(svg.getAttribute("width"));
    const height = parseLength(svg.getAttribute("height"));
    if (width && height) return { width, height };
    const box = (svg.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
    if (box.length === 4 && box[2] > 0 && box[3] > 0)
      return { width: box[2], height: box[3] };
  } catch {}
  return null;
}

const MIME = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};

// Object URL typed by the sniffed content, not the file name, so a PNG named
// .svg still decodes as a PNG (the server also goes by the bytes).
function typedUrl(file, type) {
  return URL.createObjectURL(new Blob([file], { type: MIME[type] }));
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode_failed"));
    img.src = src;
  });
}

/**
 * Checks one picked file against the slot's limits.
 * @returns {Promise<{error: string|null, type?: string, width?: number, height?: number}>}
 */
export async function inspectUpload(file, slot, limits) {
  if (!file) return { error: "missing_file" };
  const rules = slotLimits(limits, slot);
  const type = await sniffType(file).catch(() => null);
  if (!type) return { error: "unsupported_type" };
  if (file.size > rules.maxBytes) return { error: "too_large" };

  let size = null;
  if (type === "svg") {
    size = await svgSize(file);
    if (!size) return { error: "invalid_svg" };
  } else {
    const url = typedUrl(file, type);
    try {
      const img = await loadImage(url);
      size = { width: img.naturalWidth, height: img.naturalHeight };
    } catch {
      return { error: "unsupported_type" };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const { width, height } = size;
  if (slot === "icon") {
    const longest = Math.max(width, height);
    if (Math.abs(width - height) / longest > rules.squareTolerance)
      return { error: "not_square", type, width, height };
    // Vector icons scale to any size, so only raster sources need the minimum.
    if (type !== "svg" && longest < rules.minSize)
      return { error: "too_small", type, width, height };
    if (type !== "svg" && longest > rules.maxSize)
      return { error: "too_large_dimensions", type, width, height };
    return { error: null, type, width, height };
  }

  const aspect = width / height;
  if (aspect < rules.minAspect || aspect > rules.maxAspect)
    return { error: "bad_aspect", type, width, height };
  if (type !== "svg") {
    if (width < rules.minWidth || height < rules.minHeight)
      return { error: "too_small", type, width, height };
    if (width > rules.maxWidth || height > rules.maxHeight)
      return { error: "too_large_dimensions", type, width, height };
  }
  return { error: null, type, width, height };
}

function canvasToPng(canvas) {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("encode_failed"))),
      "image/png"
    )
  );
}

// Halve a large raster in steps before the final draw so small sizes stay sharp.
function stepDown(img, width, height, target) {
  let source = img;
  let w = width;
  let h = height;
  while (Math.max(w, h) / 2 >= target * 2) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w / 2);
    canvas.height = Math.round(h / 2);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    source = canvas;
    w = canvas.width;
    h = canvas.height;
  }
  return { source, w, h };
}

/**
 * Renders the icon into square PNGs (contain, transparent background).
 * @param {File} file - the validated source image
 * @param {{type: string, width: number, height: number}} info - from inspectUpload
 * @returns {Promise<Record<number, Blob>>}
 */
export async function makeIconVariants(file, info) {
  const url = typedUrl(file, info.type);
  try {
    const img = await loadImage(url);
    const width = img.naturalWidth || info.width;
    const height = img.naturalHeight || info.height;
    const out = {};
    for (const size of ICON_VARIANT_SIZES) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      const scale = Math.min(size / info.width, size / info.height);
      const dw = info.width * scale;
      const dh = info.height * scale;
      const dx = (size - dw) / 2;
      const dy = (size - dh) / 2;
      if (info.type === "svg") {
        ctx.drawImage(img, dx, dy, dw, dh);
      } else {
        const { source, w, h } = stepDown(img, width, height, Math.max(dw, dh));
        ctx.drawImage(source, 0, 0, w, h, dx, dy, dw, dh);
      }
      out[size] = await canvasToPng(canvas);
    }
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}
