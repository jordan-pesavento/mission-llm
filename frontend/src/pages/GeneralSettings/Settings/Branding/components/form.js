/**
 * Branding form model. The page edits a draft keyed by the stored labels
 * (system_settings). `fromValues` turns the raw stored values into the draft
 * shown in the form; `toValues` turns the draft back into the strings the
 * server stores. Values equal to their default are sent as "" (the server
 * reads "" as "use the default"), so a round trip through the two functions
 * is the canonical form used to detect unsaved changes.
 */

import { bannerForeground, normalizeHex } from "@/utils/branding/accent";

export { normalizeHex };

export const TABS = ["identity", "colors", "sign-in", "banner", "advanced"];

export const FIELD_TAB = {
  custom_app_name: "identity",
  brand_tagline: "identity",
  brand_accent: "identity",
  brand_default_theme: "colors",
  brand_accent_light: "colors",
  brand_login_notice_enabled: "sign-in",
  brand_login_notice_heading: "sign-in",
  brand_login_notice_text: "sign-in",
  brand_login_require_ack: "sign-in",
  brand_banner_enabled: "banner",
  brand_banner_text: "banner",
  brand_banner_bg: "banner",
  brand_banner_position: "banner",
  meta_page_title: "advanced",
  meta_page_favicon: "advanced",
  support_email: "advanced",
  footer_data: "advanced",
};

export const FIELDS = Object.keys(FIELD_TAB);

const BOOLEAN_FIELDS = [
  "brand_login_notice_enabled",
  "brand_login_require_ack",
  "brand_banner_enabled",
];

// Text fields whose empty value means "use the default text".
const DEFAULTED_TEXT_FIELDS = [
  "custom_app_name",
  "brand_tagline",
  "brand_login_notice_heading",
  "brand_login_notice_text",
  "brand_banner_text",
];

// Text fields with no default (empty stays empty).
const PLAIN_TEXT_FIELDS = ["meta_page_title", "meta_page_favicon"];

// Same limits as server/utils/branding/constants.js TEXT_LIMITS.
export const MAX_LENGTH = {
  custom_app_name: 40,
  brand_tagline: 80,
  meta_page_title: 120,
  meta_page_favicon: 2048,
  brand_login_notice_heading: 60,
  brand_login_notice_text: 1000,
  brand_banner_text: 80,
  support_email: 254,
};

export const DEFAULT_ACCENT = "#4f86ff";
export const DEFAULT_THEME_CHOICES = ["system", "dark", "light"];
export const BANNER_POSITIONS = ["both", "top"];

export const FALLBACK_DEFAULTS = {
  custom_app_name: "Mission LLM",
  brand_tagline: "Sigmatech private AI platform",
  meta_page_title: "",
  meta_page_favicon: "",
  brand_accent: DEFAULT_ACCENT,
  brand_accent_light: "",
  brand_default_theme: "system",
  brand_login_notice_enabled: "false",
  brand_login_require_ack: "false",
  brand_banner_enabled: "false",
  brand_login_notice_heading: "Authorized use only",
  brand_login_notice_text:
    "This system is for authorized users. Activity may be monitored and recorded. By signing in you agree to the acceptable use policy set by your administrator.",
  brand_banner_text: "UNCLASSIFIED",
  brand_banner_bg: "#007a33",
  brand_banner_position: "both",
  support_email: "",
  footer_data: "",
};

export const ACCENT_SWATCHES = [
  { id: "mission-blue", hex: "#4F86FF" },
  { id: "stellar-teal", hex: "#22A7A0" },
  { id: "ops-green", hex: "#3FAE6A" },
  { id: "signal-amber", hex: "#E0A43A" },
  { id: "crimson", hex: "#D9485F" },
  { id: "delta-silver", hex: "#8FA3C4" },
];

// `text` is the banner marking a preset fills in (see BannerTab).
export const BANNER_PRESETS = [
  {
    id: "unclassified",
    label: "Unclassified",
    hex: "#007A33",
    text: "UNCLASSIFIED",
  },
  { id: "cui", label: "CUI", hex: "#502B85", text: "CUI" },
  {
    id: "confidential",
    label: "Confidential",
    hex: "#0033A0",
    text: "CONFIDENTIAL",
  },
  { id: "secret", label: "Secret", hex: "#C8102E", text: "SECRET" },
  { id: "top-secret", label: "Top Secret", hex: "#FF8C00", text: "TOP SECRET" },
  { id: "ts-sci", label: "TS/SCI", hex: "#FCE83A", text: "TOP SECRET//SCI" },
];

export const FOOTER_ROWS = 3;
export const EMPTY_ICON = "Plus";

export function displayHex(hex) {
  return (normalizeHex(hex) || "").toUpperCase();
}

/**
 * Server defaults override the local fallbacks when they are non-empty strings.
 */
export function mergeDefaults(serverDefaults = {}) {
  const merged = { ...FALLBACK_DEFAULTS };
  for (const key of FIELDS) {
    const value = serverDefaults?.[key];
    if (typeof value === "string" && value.trim() !== "") merged[key] = value;
  }
  merged.brand_accent = normalizeHex(merged.brand_accent) || DEFAULT_ACCENT;
  merged.brand_banner_bg =
    normalizeHex(merged.brand_banner_bg) || FALLBACK_DEFAULTS.brand_banner_bg;
  return merged;
}

function asString(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function parseFooter(raw) {
  let list = [];
  try {
    list = typeof raw === "string" && raw.trim() ? JSON.parse(raw) : raw;
  } catch {
    list = [];
  }
  if (!Array.isArray(list)) list = [];
  const rows = list
    .filter((item) => item && typeof item === "object")
    .slice(0, FOOTER_ROWS)
    .map((item) => ({
      icon: typeof item.icon === "string" && item.icon ? item.icon : EMPTY_ICON,
      url: asString(item.url),
    }));
  while (rows.length < FOOTER_ROWS) rows.push({ icon: EMPTY_ICON, url: "" });
  return rows;
}

/**
 * Stored values -> draft shown in the form.
 */
export function fromValues(raw = {}, defaults = FALLBACK_DEFAULTS) {
  const form = {};
  for (const key of DEFAULTED_TEXT_FIELDS) {
    const value = asString(raw[key]);
    form[key] = value.trim() ? value : defaults[key];
  }
  for (const key of PLAIN_TEXT_FIELDS) form[key] = asString(raw[key]);
  for (const key of BOOLEAN_FIELDS)
    form[key] = raw[key] === true || raw[key] === "true";

  form.brand_accent = displayHex(
    normalizeHex(asString(raw.brand_accent)) || defaults.brand_accent
  );
  const light = normalizeHex(asString(raw.brand_accent_light));
  form.brand_accent_light_mode = light ? "custom" : "auto";
  form.brand_accent_light = light ? displayHex(light) : "";
  form.brand_default_theme = DEFAULT_THEME_CHOICES.includes(
    raw.brand_default_theme
  )
    ? raw.brand_default_theme
    : defaults.brand_default_theme;
  form.brand_banner_bg = displayHex(
    normalizeHex(asString(raw.brand_banner_bg)) || defaults.brand_banner_bg
  );
  form.brand_banner_position = BANNER_POSITIONS.includes(
    raw.brand_banner_position
  )
    ? raw.brand_banner_position
    : defaults.brand_banner_position;
  form.support_email = asString(raw.support_email);
  form.footer_data = parseFooter(raw.footer_data);
  return form;
}

function footerToValue(rows) {
  const used = rows
    .filter((row) => row.icon !== EMPTY_ICON || row.url.trim())
    .map((row) => ({ icon: row.icon, url: row.url.trim() }));
  return used.length ? JSON.stringify(used) : "";
}

// A hex draft that does not parse is passed through as typed, so the change
// still counts as unsaved and validation can point at it.
function hexToValue(text, fallbackDefault) {
  const hex = normalizeHex(text);
  if (!hex) return asString(text).trim();
  return fallbackDefault && hex === normalizeHex(fallbackDefault) ? "" : hex;
}

/**
 * Draft -> stored strings (canonical form).
 */
export function toValues(form, defaults = FALLBACK_DEFAULTS) {
  const out = {};
  for (const key of DEFAULTED_TEXT_FIELDS) {
    const value = asString(form[key]).trim();
    out[key] = value === "" || value === defaults[key] ? "" : value;
  }
  for (const key of PLAIN_TEXT_FIELDS) out[key] = asString(form[key]).trim();
  for (const key of BOOLEAN_FIELDS) out[key] = form[key] ? "true" : "false";
  out.brand_accent = hexToValue(form.brand_accent, defaults.brand_accent);
  out.brand_accent_light =
    form.brand_accent_light_mode === "custom"
      ? hexToValue(form.brand_accent_light, null) || "#"
      : "";
  out.brand_default_theme = form.brand_default_theme;
  out.brand_banner_bg = hexToValue(
    form.brand_banner_bg,
    defaults.brand_banner_bg
  );
  out.brand_banner_position = form.brand_banner_position;
  out.support_email = asString(form.support_email).trim();
  out.footer_data = footerToValue(form.footer_data);
  return out;
}

/**
 * Labels whose canonical value differs between the draft and the saved values.
 */
export function changedFields(form, savedForm, defaults) {
  if (!form || !savedForm) return [];
  const a = toValues(form, defaults);
  const b = toValues(savedForm, defaults);
  return FIELDS.filter((key) => a[key] !== b[key]);
}

// Same pattern as server/utils/branding/validate.js.
const EMAIL_RE =
  /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/;

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Same rule as the server: an http(s) page, or a mailto: whose address part
// (before any ?subject=) is an email address.
function isFooterLink(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return true;
    return url.protocol === "mailto:" && EMAIL_RE.test(url.pathname);
  } catch {
    return false;
  }
}

/**
 * Client-side checks that mirror the server rules. Returns
 * { errors: {label: code}, footerRows: [code|null, ...] }.
 */
export function validate(form) {
  const errors = {};
  for (const [key, max] of Object.entries(MAX_LENGTH)) {
    if (asString(form[key]).trim().length > max) errors[key] = "too_long";
  }
  if (!errors.custom_app_name && /[<>]/.test(form.custom_app_name))
    errors.custom_app_name = "invalid_chars";
  if (!normalizeHex(form.brand_accent)) errors.brand_accent = "invalid_hex";
  if (
    form.brand_accent_light_mode === "custom" &&
    !normalizeHex(form.brand_accent_light)
  )
    errors.brand_accent_light = "invalid_hex";
  if (!normalizeHex(form.brand_banner_bg))
    errors.brand_banner_bg = "invalid_hex";
  const favicon = asString(form.meta_page_favicon).trim();
  if (favicon && !isHttpUrl(favicon)) errors.meta_page_favicon = "invalid_url";
  const email = asString(form.support_email).trim();
  if (email && !EMAIL_RE.test(email)) errors.support_email = "invalid_email";

  const footerRows = form.footer_data.map((row) => {
    const url = row.url.trim();
    if (row.icon === EMPTY_ICON && !url) return null;
    if (!url) return "missing_url";
    if (row.icon === EMPTY_ICON) return "missing_icon";
    if (!isFooterLink(url)) return "invalid_link";
    return null;
  });
  if (footerRows.some(Boolean)) errors.footer_data = "invalid_rows";
  return { errors, footerRows };
}

/**
 * First tab (in tab order) that holds one of the given error labels.
 */
export function firstTabWithError(errors) {
  const tabs = new Set(
    Object.keys(errors || {})
      .map((key) => FIELD_TAB[key])
      .filter(Boolean)
  );
  return TABS.find((tab) => tabs.has(tab)) || null;
}

/**
 * Banner text color for a background (same rule as the server).
 */
export function readableOn(bgHex) {
  return bannerForeground(bgHex);
}
