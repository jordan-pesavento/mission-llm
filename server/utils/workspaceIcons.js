/**
 * Workspace tile appearance: the icon library keys and the tile color palette.
 *
 * This file is the single source of truth for which values the server accepts
 * in `workspaces.icon` and `workspaces.iconColor`. The frontend registry
 * (frontend/src/components/WorkspaceTile) maps the same icon keys to Phosphor
 * components and the same color keys to CSS; a server test fails when the two
 * lists drift apart.
 *
 * - `icon` null (or "initials" on write) means the tile shows the workspace
 *   initials, which is how every workspace looked before this feature.
 * - `iconColor` null (or "accent" on write) means the default color, the
 *   accent, which is how every workspace looked before this feature.
 */

/** Written by clients to mean "show initials"; stored as null. */
const WORKSPACE_ICON_INITIALS = "initials";

/**
 * Icon keys, kebab-case of the Phosphor component name (e.g. "test-tube" is
 * TestTube). Grouped the same way the picker groups them.
 */
const WORKSPACE_ICON_KEYS = Object.freeze([
  // Science
  "atom",
  "dna",
  "flask",
  "test-tube",
  "microscope",
  "planet",
  "magnet",
  "leaf",
  "plant",
  "tree",
  "butterfly",
  "virus",
  "lightning",
  // Math and data
  "calculator",
  "pi",
  "infinity",
  "intersect",
  "dice-five",
  "ruler",
  "compass-tool",
  "polygon",
  "cube",
  "chart-line",
  "chart-bar",
  "chart-pie",
  "graph",
  // Language and writing
  "book-open",
  "book-open-text",
  "books",
  "notebook",
  "pencil-line",
  "pen-nib",
  "feather",
  "translate",
  "text-aa",
  "quotes",
  "article",
  "chat-text",
  // Humanities and history
  "globe",
  "globe-hemisphere-west",
  "map-trifold",
  "compass",
  "mountains",
  "scroll",
  "bank",
  "crown",
  "castle-turret",
  "newspaper",
  "hourglass",
  "anchor",
  // Arts and music
  "paint-brush",
  "palette",
  "paint-bucket",
  "shapes",
  "scissors",
  "camera",
  "film-slate",
  "mask-happy",
  "music-notes",
  "piano-keys",
  "guitar",
  "microphone-stage",
  // Technology and code
  "file-code",
  "terminal-window",
  "cpu",
  "circuitry",
  "robot",
  "database",
  "cloud",
  "laptop",
  "device-mobile",
  "git-branch",
  "bug",
  "shield-check",
  "game-controller",
  // Business and law
  "briefcase",
  "scales",
  "gavel",
  "handshake",
  "buildings",
  "storefront",
  "currency-dollar",
  "coins",
  "piggy-bank",
  "chart-line-up",
  "megaphone",
  "receipt",
  // Health and sport
  "heartbeat",
  "first-aid-kit",
  "stethoscope",
  "pill",
  "syringe",
  "tooth",
  "brain",
  "carrot",
  "barbell",
  "person-simple-run",
  "soccer-ball",
  "basketball",
  // Campus and teaching
  "graduation-cap",
  "chalkboard",
  "chalkboard-teacher",
  "student",
  "users",
  "users-three",
  "exam",
  "certificate",
  "backpack",
  "clipboard-text",
  "calendar-blank",
  "presentation-chart",
  // General
  "folder",
  "star",
  "lightbulb",
  "rocket",
  "bookmark",
  "puzzle-piece",
  "target",
  "trophy",
  "flag",
  "heart",
  "flame",
  "sun",
  "coffee",
]);

/** Written by clients to mean the default color; stored as null. */
const WORKSPACE_ICON_DEFAULT_COLOR = "accent";

/** Tile color keys. "accent" follows the instance accent color. */
const WORKSPACE_ICON_COLORS = Object.freeze([
  "accent",
  "teal",
  "green",
  "amber",
  "orange",
  "red",
  "pink",
  "violet",
  "slate",
  "sky",
]);

const ICON_KEY_SET = new Set(WORKSPACE_ICON_KEYS);
const COLOR_KEY_SET = new Set(WORKSPACE_ICON_COLORS);

/** `"value"` for a string (clipped), otherwise `(an object)` and the like. */
function describeValue(value) {
  if (typeof value === "string") return `"${value.slice(0, 64)}"`;
  const type = Array.isArray(value) ? "array" : typeof value;
  return `(${/^[aeiou]/.test(type) ? "an" : "a"} ${type})`;
}

/**
 * @param {any} value - requested `icon` value
 * @returns {string|null} a user-facing error message, or null when valid
 */
function workspaceIconError(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value === WORKSPACE_ICON_INITIALS) return null;
  if (typeof value === "string" && ICON_KEY_SET.has(value)) return null;
  return `Invalid workspace icon ${describeValue(value)}. Use "${WORKSPACE_ICON_INITIALS}", null, or a key from the icon library.`;
}

/**
 * @param {any} value - requested `iconColor` value
 * @returns {string|null} a user-facing error message, or null when valid
 */
function workspaceIconColorError(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string" && COLOR_KEY_SET.has(value)) return null;
  return `Invalid workspace icon color ${describeValue(value)}. Use null or one of: ${WORKSPACE_ICON_COLORS.join(", ")}.`;
}

/**
 * Normalize a valid `icon` value for storage. Initials are stored as null.
 * Call workspaceIconError first; invalid values are not accepted here.
 * @param {string|null|undefined} value
 * @returns {string|null}
 */
function normalizeWorkspaceIcon(value) {
  if (!value || value === WORKSPACE_ICON_INITIALS) return null;
  return value;
}

/**
 * Normalize a valid `iconColor` value for storage. The default color is
 * stored as null. Call workspaceIconColorError first.
 * @param {string|null|undefined} value
 * @returns {string|null}
 */
function normalizeWorkspaceIconColor(value) {
  if (!value || value === WORKSPACE_ICON_DEFAULT_COLOR) return null;
  return value;
}

module.exports = {
  WORKSPACE_ICON_INITIALS,
  WORKSPACE_ICON_DEFAULT_COLOR,
  WORKSPACE_ICON_KEYS,
  WORKSPACE_ICON_COLORS,
  workspaceIconError,
  workspaceIconColorError,
  normalizeWorkspaceIcon,
  normalizeWorkspaceIconColor,
};
