const path = require("path");
const { DEFAULT_ACCENT_DARK } = require("./colors");

/**
 * Shared constants for instance branding (Settings > Branding).
 * Values are stored as label/value rows in `system_settings`, so no migration is needed.
 * Color math and its constants live in ./colors.js.
 */

const DEFAULT_APP_NAME = "Mission LLM";
const DEFAULT_TAGLINE = "Sigmatech private AI platform";
const DEFAULT_PAGE_TITLE = "Mission LLM | Private, self-hosted AI";
const DEFAULT_FAVICON = "/favicon.png";

const DEFAULT_NOTICE_HEADING = "Authorized use only";
const DEFAULT_NOTICE_TEXT =
  "This system is for authorized users. Activity may be monitored and recorded. By signing in you agree to the acceptable use policy set by your administrator.";

const DEFAULT_BANNER_TEXT = "UNCLASSIFIED";
const DEFAULT_BANNER_BG = "#007a33";

const ACCENT_SWATCHES = [
  { name: "Mission blue", hex: "#4f86ff" },
  { name: "Stellar teal", hex: "#22a7a0" },
  { name: "Ops green", hex: "#3fae6a" },
  { name: "Signal amber", hex: "#e0a43a" },
  { name: "Crimson", hex: "#d9485f" },
  { name: "Delta silver", hex: "#8fa3c4" },
];

const BANNER_PRESETS = [
  { name: "Unclassified", hex: "#007a33" },
  { name: "CUI", hex: "#502b85" },
  { name: "Confidential", hex: "#0033a0" },
  { name: "Secret", hex: "#c8102e" },
  { name: "Top Secret", hex: "#ff8c00" },
  { name: "TS/SCI", hex: "#fce83a" },
];

// Icons the sidebar footer editor offers (frontend/src/components/Footer).
const FOOTER_ICONS = [
  "BookOpen",
  "DiscordLogo",
  "GithubLogo",
  "Envelope",
  "LinkSimple",
  "HouseLine",
  "Globe",
  "Briefcase",
  "Info",
];
const MAX_FOOTER_LINKS = 3;

/**
 * Text and choice labels, written only through POST /admin/branding.
 * An empty string (or null) always means "not set", so the default applies.
 */
const VALUE_LABELS = [
  "custom_app_name",
  "brand_tagline",
  "meta_page_title",
  "meta_page_favicon",
  "brand_accent",
  "brand_accent_light",
  "brand_default_theme",
  "brand_login_notice_enabled",
  "brand_login_notice_heading",
  "brand_login_notice_text",
  "brand_login_require_ack",
  "brand_banner_enabled",
  "brand_banner_text",
  "brand_banner_bg",
  "brand_banner_position",
  "support_email",
  "footer_data",
];

// Labels that a reset only clears when the admin asks for it.
const LINK_LABELS = ["support_email", "footer_data"];

// Asset labels, written only by the asset endpoints.
const ASSET_LABELS = {
  "logo-dark": "brand_logo_dark",
  "logo-light": "brand_logo_light",
  icon: "brand_icon",
};
const LEGACY_LOGO_LABEL = "logo_filename";

// Every label that changes the brand (used for cache invalidation).
const BRAND_LABELS = [
  ...VALUE_LABELS,
  ...Object.values(ASSET_LABELS),
  LEGACY_LOGO_LABEL,
];

/** Display defaults for the admin form. Empty string means "computed" or "none". */
const DEFAULT_VALUES = {
  custom_app_name: DEFAULT_APP_NAME,
  brand_tagline: DEFAULT_TAGLINE,
  meta_page_title: "",
  meta_page_favicon: "",
  brand_accent: DEFAULT_ACCENT_DARK,
  brand_accent_light: "",
  brand_default_theme: "system",
  brand_login_notice_enabled: "false",
  brand_login_notice_heading: DEFAULT_NOTICE_HEADING,
  brand_login_notice_text: DEFAULT_NOTICE_TEXT,
  brand_login_require_ack: "false",
  brand_banner_enabled: "false",
  brand_banner_text: DEFAULT_BANNER_TEXT,
  brand_banner_bg: DEFAULT_BANNER_BG,
  brand_banner_position: "both",
  support_email: "",
  footer_data: "[]",
};

/** Max lengths for free-text labels (characters, after trimming). */
const TEXT_LIMITS = {
  custom_app_name: 40,
  brand_tagline: 80,
  meta_page_title: 120,
  meta_page_favicon: 2048,
  brand_login_notice_heading: 60,
  brand_login_notice_text: 1000,
  brand_banner_text: 80,
  support_email: 254,
  footer_data: 4000,
};

const MB = 1024 * 1024;
const KB = 1024;
const IMAGE_TYPES = ["png", "jpeg", "webp", "svg"];
const ICON_VARIANT_SIZES = [32, 180, 192, 512];

/**
 * Upload rules per slot. The server enforces them; the admin client reads them
 * from GET /admin/branding (`limits`) to pre-check a file before sending it.
 * SVG files have no pixel size, so only their aspect (logos) or squareness
 * (icon) is checked, using the viewBox (or width and height).
 */
const SLOT_CONFIG = {
  "logo-dark": {
    label: ASSET_LABELS["logo-dark"],
    field: "file",
    maxBytes: 2 * MB,
    types: IMAGE_TYPES,
    minWidth: 64,
    maxWidth: 4096,
    minHeight: 16,
    maxHeight: 4096,
    minAspect: 1,
    maxAspect: 12,
  },
  "logo-light": {
    label: ASSET_LABELS["logo-light"],
    field: "file",
    maxBytes: 2 * MB,
    types: IMAGE_TYPES,
    minWidth: 64,
    maxWidth: 4096,
    minHeight: 16,
    maxHeight: 4096,
    minAspect: 1,
    maxAspect: 12,
  },
  icon: {
    label: ASSET_LABELS.icon,
    field: "file",
    maxBytes: 2 * MB,
    types: IMAGE_TYPES,
    square: true,
    squareTolerance: 0.02,
    minSize: 192,
    maxSize: 4096,
    variants: Object.fromEntries(
      ICON_VARIANT_SIZES.map((size) => [
        `icon-${size}`,
        { size, maxBytes: 256 * KB, types: ["png"] },
      ])
    ),
  },
};

// Largest single file multer accepts before validation (the biggest slot limit).
const MAX_UPLOAD_BYTES = 2 * MB;

// Slots GET /system/branding/asset/:slot can serve.
const SERVE_SLOTS = [
  "logo-dark",
  "logo-light",
  "icon-32",
  "icon-180",
  "icon-192",
  "icon-512",
  "icon-source",
];

const UPLOAD_ERRORS = [
  "missing_file",
  "unsupported_type",
  "too_large",
  "too_small",
  "bad_aspect",
  "not_square",
  "invalid_svg",
  "upload_failed",
];

// Validation error codes returned per label by POST /admin/branding.
const VALUE_ERRORS = [
  "unknown_field",
  "invalid_type",
  "too_long",
  "invalid_chars",
  "invalid_hex",
  "invalid_choice",
  "invalid_url",
  "invalid_email",
  "invalid_json",
  "invalid_link",
  "too_many",
];

const CACHE_TTL_MS = 15_000;
// Reset backups: one timestamped folder per reset, newest RESET_BACKUPS_KEPT kept.
const RESET_BACKUP_PREFIX = "reset-";
const RESET_BACKUPS_KEPT = 5;

function brandingDir() {
  return process.env.STORAGE_DIR
    ? path.resolve(process.env.STORAGE_DIR, "assets", "branding")
    : path.resolve(__dirname, "../../storage/assets/branding");
}

/**
 * Reset backups live outside STORAGE_DIR/assets, so no asset or legacy logo
 * route can ever reach them (they hold the pre-reset support email, footer
 * links and notice).
 */
function brandingBackupsDir() {
  return process.env.STORAGE_DIR
    ? path.resolve(process.env.STORAGE_DIR, "branding-backups")
    : path.resolve(__dirname, "../../storage/branding-backups");
}

function legacyAssetsDir() {
  return process.env.STORAGE_DIR
    ? path.resolve(process.env.STORAGE_DIR, "assets")
    : path.resolve(__dirname, "../../storage/assets");
}

module.exports = {
  DEFAULT_APP_NAME,
  DEFAULT_TAGLINE,
  DEFAULT_PAGE_TITLE,
  DEFAULT_FAVICON,
  DEFAULT_NOTICE_HEADING,
  DEFAULT_NOTICE_TEXT,
  DEFAULT_BANNER_TEXT,
  DEFAULT_BANNER_BG,
  ACCENT_SWATCHES,
  BANNER_PRESETS,
  FOOTER_ICONS,
  MAX_FOOTER_LINKS,
  VALUE_LABELS,
  LINK_LABELS,
  ASSET_LABELS,
  LEGACY_LOGO_LABEL,
  BRAND_LABELS,
  DEFAULT_VALUES,
  TEXT_LIMITS,
  IMAGE_TYPES,
  ICON_VARIANT_SIZES,
  SLOT_CONFIG,
  MAX_UPLOAD_BYTES,
  SERVE_SLOTS,
  UPLOAD_ERRORS,
  VALUE_ERRORS,
  CACHE_TTL_MS,
  RESET_BACKUP_PREFIX,
  RESET_BACKUPS_KEPT,
  brandingDir,
  brandingBackupsDir,
  legacyAssetsDir,
};
