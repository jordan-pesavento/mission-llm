/**
 * File storage for branding assets under STORAGE_DIR/assets/branding
 * (server/storage/assets/branding in development).
 *
 * - Filenames are `<slot>-<first 16 hex of sha256>.<ext>`, so identical content
 *   always maps to the same name and a re-upload never deletes the live file.
 * - Writes are atomic (temp file in the same folder, then rename).
 * - Every path is checked with isWithin before it is read, written or removed.
 * - Built-in defaults are frontend assets and are never served from here.
 * - Reset backups go to STORAGE_DIR/branding-backups, outside the assets tree.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { isWithin, normalizePath } = require("../files");
const { isDefaultFilename } = require("../files/logo");
const {
  brandingDir,
  brandingBackupsDir,
  legacyAssetsDir,
  RESET_BACKUP_PREFIX,
  RESET_BACKUPS_KEPT,
  LEGACY_LOGO_LABEL,
} = require("./constants");
const { sniffImage, mimeForFilename } = require("./imageInfo");

const ASSET_FILENAME =
  /^(logo-dark|logo-light|icon-source|icon-32|icon-180|icon-192|icon-512)-([0-9a-f]{16})\.(png|jpg|webp|svg)$/;

function contentHash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16);
}

function assetFilename(name, buffer, ext) {
  return `${name}-${contentHash(buffer)}.${ext}`;
}

/** @returns {string|null} the 16-hex content hash in a stored filename */
function hashFromFilename(filename) {
  const match = ASSET_FILENAME.exec(String(filename || ""));
  return match ? match[2] : null;
}

/**
 * Absolute path of a stored asset, or null when the name is not a valid asset
 * filename or would resolve outside the branding folder.
 */
function assetPath(filename) {
  if (!ASSET_FILENAME.test(String(filename || ""))) return null;
  const dir = brandingDir();
  const fullPath = path.resolve(dir, filename);
  if (!isWithin(dir, fullPath)) return null;
  return fullPath;
}

function ensureDir() {
  fs.mkdirSync(brandingDir(), { recursive: true });
}

/**
 * Stores bytes under their content-hash name. Writing content that is already
 * stored is a no-op, so the live file is never replaced or removed.
 * @returns {string} the stored filename
 */
function writeAsset(name, buffer, ext) {
  const filename = assetFilename(name, buffer, ext);
  const target = assetPath(filename);
  if (!target) throw new Error("Invalid asset filename.");
  ensureDir();

  if (fs.existsSync(target) && fs.statSync(target).size === buffer.length)
    return filename;

  const temp = path.resolve(
    brandingDir(),
    `.${filename}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`
  );
  if (!isWithin(brandingDir(), temp)) throw new Error("Invalid temp path.");
  try {
    fs.writeFileSync(temp, buffer, { flag: "wx" });
    fs.renameSync(temp, target);
  } catch (error) {
    fs.rmSync(temp, { force: true });
    throw error;
  }
  return filename;
}

/**
 * Removes a stored asset unless it is in `keep`.
 * @returns {boolean} whether a file was removed
 */
function removeAsset(filename, keep = []) {
  if (!filename || keep.includes(filename)) return false;
  const target = assetPath(filename);
  if (!target || !fs.existsSync(target)) return false;
  fs.unlinkSync(target);
  return true;
}

/** @returns {{buffer: Buffer, mime: string, hash: string}|null} */
function readAsset(filename) {
  const target = assetPath(filename);
  if (!target) return null;
  try {
    const buffer = fs.readFileSync(target);
    return {
      buffer,
      mime: mimeForFilename(filename),
      hash: hashFromFilename(filename),
    };
  } catch {
    return null;
  }
}

/**
 * Path of a legacy custom logo (the old single-logo upload, `logo_filename`),
 * or null when it is unset, the shipped default (in any spelling that opens
 * it), missing, a folder, or not directly in the assets folder.
 */
function legacyLogoPath(filename) {
  if (!filename || isDefaultFilename(filename)) return null;
  try {
    const dir = legacyAssetsDir();
    const fullPath = path.resolve(dir, normalizePath(String(filename)));
    if (!isWithin(dir, fullPath)) return null;
    if (path.dirname(fullPath) !== path.resolve(dir)) return null;
    if (isDefaultFilename(path.basename(fullPath))) return null;
    return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()
      ? fullPath
      : null;
  } catch {
    return null;
  }
}

const legacyCache = new Map();

/**
 * Reads a legacy custom logo as an asset (sanitizing an SVG on the way).
 * Cached by path, size and modification time.
 * @returns {{buffer: Buffer, mime: string, hash: string, width: number|null, height: number|null}|null}
 */
function readLegacyLogo(filename) {
  const fullPath = legacyLogoPath(filename);
  if (!fullPath) return null;
  try {
    const stat = fs.statSync(fullPath);
    const key = `${fullPath}:${stat.size}:${stat.mtimeMs}`;
    if (legacyCache.has(key)) return legacyCache.get(key);

    const original = fs.readFileSync(fullPath);
    const info = sniffImage(original);
    let result = null;
    if (info && info.type === "svg") {
      const { sanitizeSvg } = require("./svg");
      const clean = sanitizeSvg(original);
      if (clean.ok)
        result = {
          buffer: clean.buffer,
          mime: info.mime,
          width: clean.width,
          height: clean.height,
        };
    } else if (info) {
      result = {
        buffer: original,
        mime: info.mime,
        width: info.width,
        height: info.height,
      };
    }
    if (result) result.hash = contentHash(result.buffer);
    legacyCache.clear();
    legacyCache.set(key, result);
    return result;
  } catch {
    return null;
  }
}

function removeLegacyLogo(filename) {
  const fullPath = legacyLogoPath(filename);
  if (!fullPath) return false;
  fs.unlinkSync(fullPath);
  return true;
}

const metaCache = new Map();

/**
 * Size and hash of a stored asset, cached by filename (names are content
 * hashes, so the content behind a name never changes).
 * @returns {{hash: string, mime: string, width: number|null, height: number|null}|null}
 *   null when the file is missing
 */
function describeAsset(filename) {
  const target = assetPath(filename);
  if (!target || !fs.existsSync(target)) return null;
  if (metaCache.has(filename)) return metaCache.get(filename);

  const buffer = fs.readFileSync(target);
  const info = sniffImage(buffer);
  let width = info?.width ?? null;
  let height = info?.height ?? null;
  if (info?.type === "svg") {
    const { sanitizeSvg } = require("./svg");
    const clean = sanitizeSvg(buffer);
    width = clean.ok ? clean.width : null;
    height = clean.ok ? clean.height : null;
  }
  const meta = {
    hash: hashFromFilename(filename),
    mime: mimeForFilename(filename),
    width,
    height,
  };
  metaCache.set(filename, meta);
  return meta;
}

/** Moves a file, copying when a rename cannot cross devices. */
function moveFile(from, to) {
  try {
    fs.renameSync(from, to);
  } catch (error) {
    if (error.code !== "EXDEV") throw error;
    fs.copyFileSync(from, to);
    fs.unlinkSync(from);
  }
}

/**
 * Timestamped name for a new backup folder, to the millisecond, for example
 * reset-20260926T083125042Z. Names sort by time.
 */
function backupFolderName(date = new Date()) {
  const stamp = date.toISOString().replace(/[-:.]/g, "");
  return `${RESET_BACKUP_PREFIX}${stamp}`;
}

/**
 * Backup folders, oldest first (the names sort by time).
 * @returns {string[]} folder names
 */
function listResetBackups() {
  const root = brandingBackupsDir();
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() && entry.name.startsWith(RESET_BACKUP_PREFIX)
    )
    .map((entry) => entry.name)
    .sort();
}

/**
 * Removes all but the newest `keep` backup folders. `current` (the folder just
 * written) is always kept.
 */
function pruneResetBackups(keep = RESET_BACKUPS_KEPT, current = null) {
  const root = brandingBackupsDir();
  const folders = listResetBackups().filter((name) => name !== current);
  const extra = folders.length - Math.max(0, current ? keep - 1 : keep);
  for (const name of folders.slice(0, Math.max(0, extra))) {
    const target = path.resolve(root, name);
    if (!isWithin(root, target)) continue;
    fs.rmSync(target, { recursive: true, force: true });
  }
}

/**
 * Moves every stored asset (and an optional legacy logo) into a new
 * timestamped folder under STORAGE_DIR/branding-backups, with the values that
 * were in place before the reset. Earlier backups are kept (the newest
 * RESET_BACKUPS_KEPT), and a reset with nothing to keep writes no backup, so
 * it never pushes out one that has files in it.
 * @param {{values: object, legacyFilename?: string|null}} options
 * @returns {{folder: string|null, files: string[]}}
 */
function backupForReset({ values = {}, legacyFilename = null } = {}) {
  const dir = brandingDir();
  const root = brandingBackupsDir();
  const names = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((name) => ASSET_FILENAME.test(name))
    : [];
  const legacyPath = legacyLogoPath(legacyFilename);
  const hasValues = Object.entries(values || {}).some(
    ([label, value]) =>
      value !== null &&
      value !== undefined &&
      value !== "" &&
      !(label === LEGACY_LOGO_LABEL && isDefaultFilename(value))
  );
  if (!names.length && !legacyPath && !hasValues)
    return { folder: null, files: [] };

  fs.mkdirSync(root, { recursive: true });
  const base = backupFolderName();
  let folder = path.resolve(root, base);
  for (let i = 2; fs.existsSync(folder); i++)
    folder = path.resolve(root, `${base}-${String(i).padStart(2, "0")}`);
  if (!isWithin(root, folder)) throw new Error("Invalid backup path.");
  fs.mkdirSync(folder);

  // The values first, so they are kept even if a file cannot be moved.
  fs.writeFileSync(
    path.resolve(folder, "values.json"),
    JSON.stringify({ resetAt: new Date().toISOString(), values }, null, 2)
  );

  const moved = [];
  for (const name of names) {
    moveFile(path.resolve(dir, name), path.resolve(folder, name));
    moved.push(name);
  }
  if (legacyPath) {
    const target = path.resolve(folder, `legacy-${path.basename(legacyPath)}`);
    moveFile(legacyPath, target);
    moved.push(path.basename(target));
  }

  try {
    pruneResetBackups(RESET_BACKUPS_KEPT, path.basename(folder));
  } catch (error) {
    console.error(
      "[branding] could not prune old reset backups:",
      error.message
    );
  }
  return { folder, files: moved };
}

// One queue per slot, so two uploads to the same slot never interleave.
const slotLocks = new Map();

/**
 * Runs `task` after every earlier task for the same slot has settled.
 * @template T
 * @param {string} slot
 * @param {() => Promise<T>} task
 * @returns {Promise<T>}
 */
function withSlotLock(slot, task) {
  const previous = slotLocks.get(slot) || Promise.resolve();
  const run = previous.then(task, task);
  const settled = run.then(
    () => {},
    () => {}
  );
  slotLocks.set(slot, settled);
  settled.then(() => {
    if (slotLocks.get(slot) === settled) slotLocks.delete(slot);
  });
  return run;
}

/** Runs `task` while holding every slot lock (used by reset). */
function withAllSlotLocks(slots, task) {
  return slots.reduceRight(
    (next, slot) => () => withSlotLock(slot, next),
    task
  )();
}

module.exports = {
  ASSET_FILENAME,
  contentHash,
  assetFilename,
  hashFromFilename,
  assetPath,
  writeAsset,
  removeAsset,
  readAsset,
  legacyLogoPath,
  readLegacyLogo,
  removeLegacyLogo,
  describeAsset,
  backupForReset,
  listResetBackups,
  pruneResetBackups,
  withSlotLock,
  withAllSlotLocks,
};
