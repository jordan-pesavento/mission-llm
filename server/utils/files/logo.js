const path = require("path");
const fs = require("fs");
const { getType } = require("mime");
const { v4 } = require("uuid");
const { SystemSettings } = require("../../models/systemSettings");
const { normalizePath, isWithin } = require(".");
const LOGO_FILENAME = "mission-llm.png";
const LOGO_FILENAME_DARK = "mission-llm-invert.png";

/**
 * Checks if the filename is the default logo filename for dark or light mode.
 * Spellings that open the same file count too: a path that resolves to it
 * ("./mission-llm.png", "x/../mission-llm.png"), another letter case, and
 * trailing dots, spaces or an NTFS stream suffix, which Windows ignores. So a
 * stored alias is never treated (or removed) as a custom logo.
 * @param {string} filename - The filename to check.
 * @returns {boolean} Whether the filename is the default logo filename.
 */
function isDefaultFilename(filename) {
  if (typeof filename !== "string" || !filename.trim()) return false;
  const base = path.posix
    .basename(path.posix.normalize(filename.trim().replace(/\\/g, "/")))
    .replace(/:.*$/, "")
    .replace(/[. ]+$/, "")
    .toLowerCase();
  return [LOGO_FILENAME, LOGO_FILENAME_DARK].includes(base);
}

function validFilename(newFilename = "") {
  return !isDefaultFilename(newFilename);
}

/**
 * Shows the logo for the current theme. In dark mode, it shows the light logo
 * and vice versa.
 * @param {boolean} darkMode - Whether the logo should be for dark mode.
 * @returns {string} The filename of the logo.
 */
function getDefaultFilename(darkMode = true) {
  return darkMode ? LOGO_FILENAME : LOGO_FILENAME_DARK;
}

/**
 * Path of a shipped default logo (mission-llm.png or mission-llm-invert.png).
 * @param {string} defaultFilename - one of the two default filenames
 * @returns {string}
 */
function defaultLogoFilepath(defaultFilename = LOGO_FILENAME) {
  const basePath = process.env.STORAGE_DIR
    ? path.join(process.env.STORAGE_DIR, "assets")
    : path.join(__dirname, "../../storage/assets");
  const name = [LOGO_FILENAME, LOGO_FILENAME_DARK].includes(defaultFilename)
    ? defaultFilename
    : LOGO_FILENAME;
  return path.join(basePath, name);
}

/**
 * The legacy custom logo file when logo_filename names a file directly in the
 * assets folder, else the default. Sub-folders (such as assets/branding) are
 * never read through here.
 */
async function determineLogoFilepath(defaultFilename = LOGO_FILENAME) {
  const currentLogoFilename = await SystemSettings.currentLogoFilename();
  const basePath = process.env.STORAGE_DIR
    ? path.join(process.env.STORAGE_DIR, "assets")
    : path.join(__dirname, "../../storage/assets");
  const defaultFilepath = defaultLogoFilepath(defaultFilename);

  if (currentLogoFilename && validFilename(currentLogoFilename)) {
    const customLogoPath = path.join(
      basePath,
      normalizePath(currentLogoFilename)
    );
    if (!isWithin(path.resolve(basePath), path.resolve(customLogoPath)))
      return defaultFilepath;
    if (path.dirname(path.resolve(customLogoPath)) !== path.resolve(basePath))
      return defaultFilepath;
    return fs.existsSync(customLogoPath) ? customLogoPath : defaultFilepath;
  }

  return defaultFilepath;
}

function fetchLogo(logoPath) {
  if (!fs.existsSync(logoPath)) {
    return {
      found: false,
      buffer: null,
      size: 0,
      mime: "none/none",
    };
  }

  const mime = getType(logoPath);
  const buffer = fs.readFileSync(logoPath);
  return {
    found: true,
    buffer,
    size: buffer.length,
    mime,
  };
}

async function renameLogoFile(originalFilename = null) {
  const extname = path.extname(originalFilename) || ".png";
  const newFilename = `${v4()}${extname}`;
  const assetsDirectory = process.env.STORAGE_DIR
    ? path.join(process.env.STORAGE_DIR, "assets")
    : path.join(__dirname, `../../storage/assets`);
  const originalFilepath = path.join(
    assetsDirectory,
    normalizePath(originalFilename)
  );
  if (!isWithin(path.resolve(assetsDirectory), path.resolve(originalFilepath)))
    throw new Error("Invalid file path.");

  // The output always uses a random filename.
  const outputFilepath = process.env.STORAGE_DIR
    ? path.join(process.env.STORAGE_DIR, "assets", normalizePath(newFilename))
    : path.join(__dirname, `../../storage/assets`, normalizePath(newFilename));

  fs.renameSync(originalFilepath, outputFilepath);
  return newFilename;
}

async function removeCustomLogo(logoFilename = LOGO_FILENAME) {
  if (!logoFilename || !validFilename(logoFilename)) return false;
  const assetsDirectory = process.env.STORAGE_DIR
    ? path.join(process.env.STORAGE_DIR, "assets")
    : path.join(__dirname, `../../storage/assets`);

  const logoPath = path.join(assetsDirectory, normalizePath(logoFilename));
  if (!isWithin(path.resolve(assetsDirectory), path.resolve(logoPath)))
    throw new Error("Invalid file path.");
  if (fs.existsSync(logoPath)) fs.unlinkSync(logoPath);
  return true;
}

module.exports = {
  fetchLogo,
  renameLogoFile,
  removeCustomLogo,
  validFilename,
  getDefaultFilename,
  determineLogoFilepath,
  defaultLogoFilepath,
  isDefaultFilename,
  LOGO_FILENAME,
  LOGO_FILENAME_DARK,
};
