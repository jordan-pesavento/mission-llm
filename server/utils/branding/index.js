/**
 * Instance branding: the public brand object, admin reads and writes, asset
 * slots and reset. Endpoints live in server/endpoints/branding.js.
 *
 * The public brand is cached in-process for CACHE_TTL_MS and dropped after every
 * write (including legacy writes through SystemSettings), and it carries a
 * `version` hash that changes whenever any branding value or asset changes.
 */

const crypto = require("crypto");
const prisma = require("../prisma");
const {
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
  VALUE_LABELS,
  LINK_LABELS,
  ASSET_LABELS,
  LEGACY_LOGO_LABEL,
  BRAND_LABELS,
  DEFAULT_VALUES,
  SLOT_CONFIG,
  ICON_VARIANT_SIZES,
  CACHE_TTL_MS,
} = require("./constants");
const {
  computeAccent,
  accentCss,
  bannerTextColor,
  normalizeHex,
} = require("./colors");
const assets = require("./assets");
const { validateValues, validateUpload, UploadError } = require("./validate");
const { state, invalidateBrand } = require("./cache");
const { LOGO_FILENAME, isDefaultFilename } = require("../files/logo");

const ICON_KEYS = ["source", ...ICON_VARIANT_SIZES.map(String)];

/**
 * Reads raw values for labels. Missing rows and empty strings read as null.
 * @param {string[]} labels
 * @returns {Promise<Record<string, string|null>>}
 */
async function readLabels(labels) {
  const rows = await prisma.system_settings.findMany({
    where: { label: { in: labels } },
  });
  const values = Object.fromEntries(labels.map((label) => [label, null]));
  for (const row of rows) {
    values[row.label] =
      typeof row.value === "string" && row.value !== "" ? row.value : null;
  }
  return values;
}

function upsertOp(label, value) {
  return prisma.system_settings.upsert({
    where: { label },
    update: { value },
    create: { label, value },
  });
}

/** @returns {Record<string, string>|null} a valid brand_icon map, else null */
function parseIcon(value) {
  if (!value) return null;
  try {
    const icon = JSON.parse(value);
    if (!icon || typeof icon !== "object") return null;
    return ICON_KEYS.every((key) => assets.assetPath(icon[key])) ? icon : null;
  } catch {
    return null;
  }
}

/** Every stored filename a slot value points to. */
function slotFilenames(slot, value) {
  if (!value) return [];
  if (slot !== "icon") return [value];
  const icon = parseIcon(value);
  return icon ? ICON_KEYS.map((key) => icon[key]) : [];
}

function assetUrl(slot, hash) {
  return `/system/branding/asset/${slot}?v=${hash}`;
}

/** Served slot name for a brand_icon key ("source" or a size). */
function iconSlot(key) {
  return key === "source" ? "icon-source" : `icon-${key}`;
}

/**
 * The value as an http(s) URL, else null. Older rows may predate validation,
 * so stored URLs are checked again before they reach a page.
 */
function httpUrlOrNull(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Whether the legacy logo_filename points at a custom (non-shipped) logo. Any
 * spelling of a shipped default counts as the default (isDefaultFilename).
 */
function isCustomLegacy(filename) {
  return !!filename && !isDefaultFilename(filename);
}

/**
 * Resolves the asset slots: public descriptions plus the internal file map the
 * asset endpoint serves from.
 */
function resolveAssets(raw) {
  const files = {};

  const storedLogo = (slot, filename) => {
    const meta = assets.describeAsset(filename);
    if (!meta) return null;
    files[slot] = { kind: "stored", filename, hash: meta.hash };
    return {
      url: assetUrl(slot, meta.hash),
      width: meta.width,
      height: meta.height,
    };
  };

  let dark = storedLogo("logo-dark", raw[ASSET_LABELS["logo-dark"]]);
  let legacy = false;
  if (!dark) {
    const old = assets.readLegacyLogo(raw[LEGACY_LOGO_LABEL]);
    if (old) {
      legacy = true;
      files["logo-dark"] = {
        kind: "legacy",
        filename: raw[LEGACY_LOGO_LABEL],
        hash: old.hash,
      };
      dark = {
        url: assetUrl("logo-dark", old.hash),
        width: old.width,
        height: old.height,
      };
    }
  }
  const light = storedLogo("logo-light", raw[ASSET_LABELS["logo-light"]]);

  const logoEntry = (own, other) => {
    if (own)
      return {
        url: own.url,
        custom: true,
        inherited: false,
        width: own.width,
        height: own.height,
      };
    if (other)
      return {
        url: other.url,
        custom: false,
        inherited: true,
        width: other.width,
        height: other.height,
      };
    return {
      url: null,
      custom: false,
      inherited: false,
      width: null,
      height: null,
    };
  };

  // The icon counts only when the source and every variant are on disk.
  let icon = { custom: false, urls: null };
  const iconMap = parseIcon(raw[ASSET_LABELS.icon]);
  const iconMeta = iconMap
    ? ICON_KEYS.map((key) => [key, assets.describeAsset(iconMap[key])])
    : [];
  if (iconMap && iconMeta.every(([, meta]) => !!meta)) {
    const urls = {};
    for (const [key, meta] of iconMeta) {
      const slot = iconSlot(key);
      files[slot] = { kind: "stored", filename: iconMap[key], hash: meta.hash };
      urls[key] = assetUrl(slot, meta.hash);
    }
    icon = { custom: true, urls };
  }

  let favicon = { url: DEFAULT_FAVICON, source: "default" };
  const faviconUrl = httpUrlOrNull(raw.meta_page_favicon);
  if (faviconUrl) favicon = { url: faviconUrl, source: "url" };
  else if (icon.custom) favicon = { url: icon.urls["32"], source: "icon" };

  const logoDark = logoEntry(dark, light);
  if (legacy) logoDark.legacy = true;
  return {
    public: { logoDark, logoLight: logoEntry(light, dark), icon, favicon },
    files,
  };
}

function versionOf(raw) {
  // An unset legacy logo and the shipped default name look the same, so they
  // give the same version.
  const value = (label) =>
    label === LEGACY_LOGO_LABEL && !isCustomLegacy(raw[label])
      ? null
      : raw[label];
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(BRAND_LABELS.map((label) => [label, value(label)])))
    .digest("hex")
    .slice(0, 12);
}

async function buildBrand() {
  const raw = await readLabels(BRAND_LABELS);
  const customAppName = raw.custom_app_name;
  const customTagline = raw.brand_tagline;
  const appName = customAppName ?? DEFAULT_APP_NAME;
  const tagline = customTagline ?? DEFAULT_TAGLINE;
  const pageTitle =
    raw.meta_page_title ??
    (customAppName || customTagline
      ? `${appName} | ${tagline}`
      : DEFAULT_PAGE_TITLE);

  const accent = computeAccent(
    normalizeHex(raw.brand_accent),
    normalizeHex(raw.brand_accent_light)
  );
  const resolved = resolveAssets(raw);
  const noticeEnabled = raw.brand_login_notice_enabled === "true";
  const bannerBg = normalizeHex(raw.brand_banner_bg) ?? DEFAULT_BANNER_BG;

  const brand = {
    version: versionOf(raw),
    appName,
    customAppName,
    tagline,
    customTagline,
    pageTitle,
    defaultTheme: ["system", "dark", "light"].includes(raw.brand_default_theme)
      ? raw.brand_default_theme
      : "system",
    accent,
    css: accentCss(accent),
    assets: resolved.public,
    login: {
      notice: {
        enabled: noticeEnabled,
        heading: raw.brand_login_notice_heading ?? DEFAULT_NOTICE_HEADING,
        text: raw.brand_login_notice_text ?? DEFAULT_NOTICE_TEXT,
      },
      // An acknowledgment needs a notice to acknowledge.
      requireAck: noticeEnabled && raw.brand_login_require_ack === "true",
    },
    banner: {
      enabled: raw.brand_banner_enabled === "true",
      text: raw.brand_banner_text ?? DEFAULT_BANNER_TEXT,
      bg: bannerBg,
      fg: bannerTextColor(bannerBg),
      position: raw.brand_banner_position === "top" ? "top" : "both",
    },
  };
  return { brand, files: resolved.files };
}

/**
 * The cached brand entry, rebuilt when older than CACHE_TTL_MS or invalidated.
 * @param {{fresh?: boolean}} options - fresh skips the cache
 * @returns {Promise<{brand: object, files: object}>}
 */
async function getBrandEntry({ fresh = false } = {}) {
  if (!fresh && state.entry && Date.now() - state.entry.at < CACHE_TTL_MS)
    return state.entry;
  if (!fresh && state.inflight) return state.inflight;

  const generation = state.generation;
  const pending = buildBrand().then((entry) => {
    if (generation === state.generation)
      state.entry = { ...entry, at: Date.now() };
    return entry;
  });
  if (!fresh) {
    state.inflight = pending;
    pending
      .finally(() => {
        if (state.inflight === pending) state.inflight = null;
      })
      .catch(() => {});
  }
  return pending;
}

/** The PublicBrand object (GET /system/branding). */
async function getBrand(options = {}) {
  return (await getBrandEntry(options)).brand;
}

/**
 * The file behind a served slot (logo-dark, icon-32, ...).
 * @returns {Promise<{buffer: Buffer, mime: string, hash: string}|null>}
 */
async function getAssetFile(slot) {
  const { files } = await getBrandEntry();
  const entry = files[slot];
  if (!entry) return null;
  if (entry.kind === "legacy") {
    const old = assets.readLegacyLogo(entry.filename);
    return old ? { buffer: old.buffer, mime: old.mime, hash: old.hash } : null;
  }
  return assets.readAsset(entry.filename);
}

/** GET /admin/branding payload. */
async function getAdminBrand() {
  const values = await readLabels(VALUE_LABELS);
  return {
    values,
    defaults: DEFAULT_VALUES,
    limits: SLOT_CONFIG,
    presets: { accents: ACCENT_SWATCHES, banners: BANNER_PRESETS },
    brand: await getBrand({ fresh: true }),
  };
}

/**
 * Validates every value first; writes nothing if any value is invalid.
 * Changed values are written in one transaction.
 * @param {Record<string, any>} values
 * @returns {Promise<{success: false, errors: object} | {success: true, changed: string[], brand: object, values: object}>}
 */
async function updateBrandValues(values) {
  const { ok, clean, errors } = validateValues(values);
  if (!ok) return { success: false, errors };

  const labels = Object.keys(clean);
  const current = labels.length ? await readLabels(labels) : {};
  const changed = labels.filter((label) => current[label] !== clean[label]);
  if (changed.length) {
    await prisma.$transaction(
      changed.map((label) => upsertOp(label, clean[label]))
    );
    invalidateBrand();
  }
  return {
    success: true,
    changed,
    brand: await getBrand(),
    values: await readLabels(VALUE_LABELS),
  };
}

/**
 * Removes files a committed change no longer references. Failures only leave
 * an orphan file behind, so they are logged and never undo the change.
 * @param {string[]} filenames - previously referenced stored assets
 * @param {string[]} keep - files the new value references
 * @param {string|null} legacyFilename - legacy logo to remove, if any
 */
function removeReplacedFiles(filenames, keep = [], legacyFilename = null) {
  for (const filename of filenames) {
    try {
      assets.removeAsset(filename, keep);
    } catch (error) {
      console.error(`[branding] could not remove ${filename}:`, error.message);
    }
  }
  if (!legacyFilename) return;
  try {
    assets.removeLegacyLogo(legacyFilename);
  } catch (error) {
    console.error(
      "[branding] could not remove the legacy logo:",
      error.message
    );
  }
}

/**
 * Stores an uploaded logo or icon set. Validation happens before anything is
 * written; replaced files are removed only after the new value is saved, and a
 * file whose content did not change is kept (same content, same name).
 * @param {"logo-dark"|"logo-light"|"icon"} slot
 * @param {Record<string, {buffer: Buffer}>} filesByField
 * @returns {Promise<object>} the new PublicBrand
 * @throws {UploadError}
 */
async function setAsset(slot, filesByField) {
  const files = validateUpload(slot, filesByField);
  const label = ASSET_LABELS[slot];

  return assets.withSlotLock(slot, async () => {
    const current = await readLabels([label, LEGACY_LOGO_LABEL]);
    const previous = slotFilenames(slot, current[label]);
    // A new dark logo retires the legacy single-logo upload.
    const retireLegacy =
      slot === "logo-dark" && isCustomLegacy(current[LEGACY_LOGO_LABEL]);
    const written = [];

    try {
      for (const file of files)
        written.push({
          name: file.name,
          filename: assets.writeAsset(
            file.name,
            file.image.buffer,
            file.image.ext
          ),
        });

      let value = written[0].filename;
      if (slot === "icon") {
        const byName = Object.fromEntries(
          written.map((w) => [w.name, w.filename])
        );
        value = JSON.stringify(
          Object.fromEntries(
            ICON_KEYS.map((key) => [key, byName[iconSlot(key)]])
          )
        );
      }

      const ops = [upsertOp(label, value)];
      if (retireLegacy) ops.push(upsertOp(LEGACY_LOGO_LABEL, LOGO_FILENAME));
      await prisma.$transaction(ops);
      invalidateBrand();
    } catch (error) {
      // Nothing was saved: drop files this upload created that nothing references.
      for (const { filename } of written)
        if (!previous.includes(filename)) removeReplacedFiles([filename]);
      console.error("[branding] asset upload failed:", error.message);
      throw new UploadError("upload_failed", null, 500);
    }

    removeReplacedFiles(
      previous,
      written.map((w) => w.filename),
      retireLegacy ? current[LEGACY_LOGO_LABEL] : null
    );
    return getBrand();
  });
}

/**
 * Resets one asset slot to its built-in default.
 * @param {"logo-dark"|"logo-light"|"icon"} slot
 * @returns {Promise<{brand: object, removed: boolean}>}
 */
async function removeAsset(slot) {
  const label = ASSET_LABELS[slot];
  if (!label) throw new UploadError("upload_failed", "unknown slot", 404);

  return assets.withSlotLock(slot, async () => {
    const current = await readLabels([label, LEGACY_LOGO_LABEL]);
    const previous = slotFilenames(slot, current[label]);
    const legacy =
      slot === "logo-dark" && isCustomLegacy(current[LEGACY_LOGO_LABEL]);

    const ops = [];
    if (current[label] !== null) ops.push(upsertOp(label, null));
    if (legacy) ops.push(upsertOp(LEGACY_LOGO_LABEL, LOGO_FILENAME));
    if (ops.length) {
      await prisma.$transaction(ops);
      invalidateBrand();
    }
    removeReplacedFiles(
      previous,
      [],
      legacy ? current[LEGACY_LOGO_LABEL] : null
    );
    return { brand: await getBrand(), removed: ops.length > 0 };
  });
}

/**
 * Restores every branding value and asset to its default. Stored files move to
 * a new timestamped folder under STORAGE_DIR/branding-backups together with
 * the previous values (see assets.backupForReset).
 * @param {{includeLinks?: boolean}} options - also reset support email and footer links
 * @returns {Promise<{brand: object, changed: string[], backup: {folder: string|null, files: string[]}}>}
 */
async function resetBranding({ includeLinks = false } = {}) {
  const valueLabels = VALUE_LABELS.filter(
    (label) => includeLinks || !LINK_LABELS.includes(label)
  );
  const assetLabels = Object.values(ASSET_LABELS);

  return assets.withAllSlotLocks(Object.keys(ASSET_LABELS), async () => {
    const before = await readLabels([
      ...valueLabels,
      ...assetLabels,
      LEGACY_LOGO_LABEL,
    ]);
    const changed = [...valueLabels, ...assetLabels].filter(
      (label) => before[label] !== null
    );
    const legacy = isCustomLegacy(before[LEGACY_LOGO_LABEL]);
    if (legacy) changed.push(LEGACY_LOGO_LABEL);

    await prisma.$transaction([
      prisma.system_settings.updateMany({
        where: { label: { in: [...valueLabels, ...assetLabels] } },
        data: { value: null },
      }),
      ...(legacy ? [upsertOp(LEGACY_LOGO_LABEL, LOGO_FILENAME)] : []),
    ]);
    invalidateBrand();

    let backup = { folder: null, files: [] };
    try {
      backup = assets.backupForReset({
        values: before,
        legacyFilename: legacy ? before[LEGACY_LOGO_LABEL] : null,
      });
    } catch (error) {
      console.error("[branding] reset backup failed:", error.message);
    }
    return { brand: await getBrand(), changed, backup };
  });
}

/**
 * Whether sign-in must carry `acknowledged: true` (notice shown and required).
 * @returns {Promise<boolean>}
 */
async function signInAckRequired() {
  try {
    return (await getBrand()).login.requireAck === true;
  } catch (error) {
    console.error("[branding] could not read sign-in settings:", error.message);
    return false;
  }
}

module.exports = {
  getBrand,
  getBrandEntry,
  getAssetFile,
  getAdminBrand,
  updateBrandValues,
  setAsset,
  removeAsset,
  resetBranding,
  signInAckRequired,
  invalidateBrand,
  UploadError,
};
