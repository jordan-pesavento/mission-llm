/**
 * Validation for branding values (POST /admin/branding) and uploads
 * (POST /admin/branding/asset/:slot). Everything is validated before anything
 * is written, and each failure is reported as a short error code.
 */

const {
  VALUE_LABELS,
  TEXT_LIMITS,
  FOOTER_ICONS,
  MAX_FOOTER_LINKS,
  SLOT_CONFIG,
} = require("./constants");
const { normalizeHex } = require("./colors");
const { sniffImage } = require("./imageInfo");
const { sanitizeSvg } = require("./svg");

/**
 * Whether text holds C0 control characters or DEL. Line breaks and tabs are
 * allowed only in multi-line text.
 */
function hasControlChars(text, multiLine = false) {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (multiLine && (code === 0x0a || code === 0x09)) continue;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

const EMAIL =
  /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/;

class ValueError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function asString(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  throw new ValueError("invalid_type");
}

function singleLine(label, { forbidAngles = false } = {}) {
  return (value) => {
    const text = asString(value).trim();
    if (!text) return null;
    if (hasControlChars(text)) throw new ValueError("invalid_chars");
    if (forbidAngles && /[<>]/.test(text))
      throw new ValueError("invalid_chars");
    if (text.length > TEXT_LIMITS[label]) throw new ValueError("too_long");
    return text;
  };
}

function multiLine(label) {
  return (value) => {
    const text = asString(value).replace(/\r\n?/g, "\n").trim();
    if (!text) return null;
    if (hasControlChars(text, true)) throw new ValueError("invalid_chars");
    if (text.length > TEXT_LIMITS[label]) throw new ValueError("too_long");
    return text;
  };
}

function hexColor(value) {
  const text = asString(value).trim();
  if (!text) return null;
  const hex = normalizeHex(text);
  if (!hex) throw new ValueError("invalid_hex");
  return hex;
}

function choice(options) {
  return (value) => {
    const text = asString(value).trim();
    if (!text) return null;
    if (!options.includes(text)) throw new ValueError("invalid_choice");
    return text;
  };
}

function toggle(value) {
  if (value === true || value === false) return String(value);
  const text = asString(value).trim();
  if (!text) return null;
  if (text !== "true" && text !== "false")
    throw new ValueError("invalid_choice");
  return text;
}

function httpUrl(value) {
  const text = asString(value).trim();
  if (!text) return null;
  if (text.length > TEXT_LIMITS.meta_page_favicon)
    throw new ValueError("too_long");
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new ValueError("invalid_url");
  }
  if (!["http:", "https:"].includes(url.protocol))
    throw new ValueError("invalid_url");
  return url.toString();
}

function email(value) {
  const text = asString(value).trim();
  if (!text) return null;
  if (text.length > TEXT_LIMITS.support_email) throw new ValueError("too_long");
  if (!EMAIL.test(text)) throw new ValueError("invalid_email");
  return text;
}

/**
 * Footer links may be http(s) pages or mailto: addresses.
 * @param {string} value
 */
function isValidFooterUrl(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    if (["http:", "https:"].includes(url.protocol)) return true;
    if (url.protocol === "mailto:") return EMAIL.test(url.pathname);
    return false;
  } catch {
    return false;
  }
}

function footerData(value) {
  let list = value;
  if (typeof value === "string") {
    if (!value.trim()) return null;
    if (value.length > TEXT_LIMITS.footer_data)
      throw new ValueError("too_long");
    try {
      list = JSON.parse(value);
    } catch {
      throw new ValueError("invalid_json");
    }
  }
  if (list === null || list === undefined) return null;
  if (!Array.isArray(list)) throw new ValueError("invalid_json");
  const links = list.filter((item) => item !== null);
  if (links.length > MAX_FOOTER_LINKS) throw new ValueError("too_many");
  const clean = links.map((item) => {
    if (typeof item !== "object" || Array.isArray(item))
      throw new ValueError("invalid_link");
    const icon = typeof item.icon === "string" ? item.icon : "";
    const url = typeof item.url === "string" ? item.url.trim() : "";
    if (!FOOTER_ICONS.includes(icon) || !isValidFooterUrl(url))
      throw new ValueError("invalid_link");
    return { icon, url };
  });
  return JSON.stringify(clean);
}

const VALIDATORS = {
  custom_app_name: singleLine("custom_app_name", { forbidAngles: true }),
  brand_tagline: singleLine("brand_tagline"),
  meta_page_title: singleLine("meta_page_title"),
  meta_page_favicon: httpUrl,
  brand_accent: hexColor,
  brand_accent_light: hexColor,
  brand_default_theme: choice(["system", "dark", "light"]),
  brand_login_notice_enabled: toggle,
  brand_login_notice_heading: singleLine("brand_login_notice_heading"),
  brand_login_notice_text: multiLine("brand_login_notice_text"),
  brand_login_require_ack: toggle,
  brand_banner_enabled: toggle,
  brand_banner_text: singleLine("brand_banner_text"),
  brand_banner_bg: hexColor,
  brand_banner_position: choice(["both", "top"]),
  support_email: email,
  footer_data: footerData,
};

/**
 * Validates a subset of branding values. Nothing is partially accepted.
 * @param {Record<string, any>} values
 * @returns {{ok: boolean, clean: Record<string, string|null>, errors: Record<string, string>}}
 *   `clean` holds the stored form of every label (null means "use the default").
 */
function validateValues(values) {
  // No prototype: a key such as "__proto__" is recorded as an error like any
  // other unknown field instead of hitting the Object.prototype setter.
  const errors = Object.create(null);
  const clean = {};
  if (!values || typeof values !== "object" || Array.isArray(values))
    return { ok: false, clean, errors: { values: "invalid_type" } };

  for (const [label, value] of Object.entries(values)) {
    if (!VALUE_LABELS.includes(label)) {
      errors[label] = "unknown_field";
      continue;
    }
    try {
      clean[label] = VALIDATORS[label](value);
    } catch (error) {
      errors[label] = error instanceof ValueError ? error.code : "invalid_type";
    }
  }
  return { ok: Object.keys(errors).length === 0, clean, errors };
}

class UploadError extends Error {
  constructor(code, detail = null, status = 400) {
    super(code);
    this.code = code;
    this.detail = detail;
    this.status = status;
  }
}

/**
 * Identifies one uploaded file and applies the size and dimension rules.
 * @param {{buffer: Buffer, size?: number}} file
 * @param {object} rule - an entry of SLOT_CONFIG (or of its icon variants)
 * @param {string} field - multipart field name, used in error details
 * @returns {{buffer: Buffer, ext: string, mime: string, type: string, width: number|null, height: number|null}}
 */
function checkFile(file, rule, field) {
  if (!file?.buffer?.length) throw new UploadError("missing_file", field);
  if (file.buffer.length > rule.maxBytes)
    throw new UploadError("too_large", field, 413);

  const info = sniffImage(file.buffer);
  if (!info || !rule.types.includes(info.type))
    throw new UploadError("unsupported_type", field);

  let buffer = file.buffer;
  let { width, height } = info;
  if (info.type === "svg") {
    const result = sanitizeSvg(file.buffer);
    if (!result.ok) throw new UploadError("invalid_svg", field);
    if (!result.width || !result.height)
      throw new UploadError("invalid_svg", `${field}: no viewBox or size`);
    buffer = result.buffer;
    width = result.width;
    height = result.height;
  }
  if (!width || !height) throw new UploadError("unsupported_type", field);
  return {
    buffer,
    ext: info.ext,
    mime: info.mime,
    type: info.type,
    width,
    height,
  };
}

function checkLogo(image, rule, field) {
  const aspect = image.width / image.height;
  if (aspect < rule.minAspect || aspect > rule.maxAspect)
    throw new UploadError("bad_aspect", field);
  if (image.type === "svg") return; // vector, any pixel size works
  if (image.width < rule.minWidth || image.height < rule.minHeight)
    throw new UploadError("too_small", field);
  if (image.width > rule.maxWidth || image.height > rule.maxHeight)
    throw new UploadError("too_large", `${field}: dimensions`);
}

function checkIconSource(image, rule, field) {
  const longest = Math.max(image.width, image.height);
  if (Math.abs(image.width - image.height) / longest > rule.squareTolerance)
    throw new UploadError("not_square", field);
  if (image.type === "svg") return;
  if (longest < rule.minSize) throw new UploadError("too_small", field);
  if (longest > rule.maxSize)
    throw new UploadError("too_large", `${field}: dimensions`);
}

/**
 * Validates every file of an upload before anything is written.
 * @param {"logo-dark"|"logo-light"|"icon"} slot
 * @param {Record<string, {buffer: Buffer}>} filesByField
 * @returns {{field: string, name: string, image: object}[]} files to store,
 *   `name` being the storage slot name (logo-dark, icon-source, icon-32, ...)
 * @throws {UploadError}
 */
function validateUpload(slot, filesByField = {}) {
  const rule = SLOT_CONFIG[slot];
  if (!rule) throw new UploadError("upload_failed", "unknown slot", 404);

  const source = filesByField[rule.field];
  if (!source) throw new UploadError("missing_file", rule.field);
  const image = checkFile(source, rule, rule.field);

  if (slot !== "icon") {
    checkLogo(image, rule, rule.field);
    return [{ field: rule.field, name: slot, image }];
  }

  checkIconSource(image, rule, rule.field);
  const output = [{ field: rule.field, name: "icon-source", image }];
  for (const [field, variant] of Object.entries(rule.variants)) {
    const file = filesByField[field];
    if (!file) throw new UploadError("missing_file", field);
    const png = checkFile(file, variant, field);
    if (png.width !== variant.size || png.height !== variant.size)
      throw new UploadError(
        "upload_failed",
        `${field} must be ${variant.size}x${variant.size}`
      );
    output.push({ field, name: field, image: png });
  }
  return output;
}

module.exports = {
  VALIDATORS,
  validateValues,
  validateUpload,
  isValidFooterUrl,
  UploadError,
};
