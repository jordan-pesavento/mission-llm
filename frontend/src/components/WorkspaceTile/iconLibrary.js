/**
 * Workspace tile library: the icon keys a workspace can use in place of its
 * initials (grouped for an education-first product, each with search
 * keywords) and the tile color palette.
 *
 * Pure data and helpers (no React, no DOM), so Node scripts can check it:
 * the keys must match the server allowlist in server/utils/workspaceIcons.js
 * exactly (server/__tests__/utils/workspaceIcons.test.js and
 * frontend/scripts/verifyWorkspaceIcons.mjs). Each key maps to a
 * Phosphor icon in ./icons.js, and its label lives in the locale files under
 * general.icon.names.<key>.
 */

/** Library groups, in display order. Labels: general.icon.groups.<id>. */
export const WORKSPACE_ICON_GROUPS = [
  "science",
  "math",
  "language",
  "humanities",
  "arts",
  "technology",
  "business",
  "health",
  "campus",
  "general",
];

/**
 * Every icon in the library, in display order. `keywords` feed search and
 * the suggestion for a workspace name (earlier keywords weigh more).
 * @type {{key: string, group: string, keywords: string[]}[]}
 */
export const WORKSPACE_ICONS = [
  // Science
  {
    key: "atom",
    group: "science",
    keywords: ["physics", "chemistry", "nuclear", "particle"],
  },
  {
    key: "dna",
    group: "science",
    keywords: ["biology", "genetics", "gene", "helix"],
  },
  {
    key: "flask",
    group: "science",
    keywords: ["chemistry", "lab", "experiment", "beaker"],
  },
  {
    key: "test-tube",
    group: "science",
    keywords: ["chemistry", "lab", "sample", "experiment"],
  },
  {
    key: "microscope",
    group: "science",
    keywords: ["biology", "lab", "research", "cell"],
  },
  {
    key: "planet",
    group: "science",
    keywords: ["astronomy", "space", "saturn", "earth", "science"],
  },
  {
    key: "magnet",
    group: "science",
    keywords: ["physics", "magnetism", "force"],
  },
  {
    key: "leaf",
    group: "science",
    keywords: ["biology", "botany", "nature", "environment", "ecology"],
  },
  {
    key: "plant",
    group: "science",
    keywords: ["botany", "biology", "growth", "agriculture", "seedling"],
  },
  {
    key: "tree",
    group: "science",
    keywords: ["nature", "forest", "ecology", "environment"],
  },
  {
    key: "butterfly",
    group: "science",
    keywords: ["biology", "insect", "nature", "zoology"],
  },
  {
    key: "virus",
    group: "science",
    keywords: ["microbiology", "disease", "biology", "medicine"],
  },
  {
    key: "lightning",
    group: "science",
    keywords: ["electricity", "energy", "physics", "power"],
  },
  // Math and data
  {
    key: "calculator",
    group: "math",
    keywords: [
      "math",
      "arithmetic",
      "numbers",
      "accounting",
      "algebra",
      "formula",
      "sum",
    ],
  },
  {
    key: "pi",
    group: "math",
    keywords: ["math", "geometry", "circle", "greek"],
  },
  { key: "infinity", group: "math", keywords: ["math", "calculus", "limit"] },
  {
    key: "intersect",
    group: "math",
    keywords: ["sets", "logic", "venn", "probability", "algebra"],
  },
  {
    key: "dice-five",
    group: "math",
    keywords: ["probability", "chance", "statistics", "random", "game"],
  },
  { key: "ruler", group: "math", keywords: ["measure", "geometry", "length"] },
  {
    key: "compass-tool",
    group: "math",
    keywords: ["geometry", "drafting", "circle", "math"],
  },
  {
    key: "polygon",
    group: "math",
    keywords: ["geometry", "shape", "angles", "trigonometry"],
  },
  {
    key: "cube",
    group: "math",
    keywords: ["geometry", "3d", "shape", "solid"],
  },
  {
    key: "chart-line",
    group: "math",
    keywords: [
      "data",
      "statistics",
      "graph",
      "trend",
      "analytics",
      "regression",
    ],
  },
  {
    key: "chart-bar",
    group: "math",
    keywords: ["data", "statistics", "graph", "analytics"],
  },
  {
    key: "chart-pie",
    group: "math",
    keywords: ["data", "statistics", "share", "percent"],
  },
  {
    key: "graph",
    group: "math",
    keywords: ["network", "nodes", "data", "discrete", "connections"],
  },
  // Language and writing
  {
    key: "book-open",
    group: "language",
    keywords: ["reading", "literature", "english", "study"],
  },
  {
    key: "book-open-text",
    group: "language",
    keywords: ["reading", "literature", "text", "study"],
  },
  {
    key: "books",
    group: "language",
    keywords: ["library", "literature", "reading", "shelf"],
  },
  {
    key: "notebook",
    group: "language",
    keywords: ["notes", "journal", "writing", "study"],
  },
  {
    key: "pencil-line",
    group: "language",
    keywords: ["writing", "composition", "draft", "edit"],
  },
  {
    key: "pen-nib",
    group: "language",
    keywords: ["writing", "calligraphy", "ink", "design"],
  },
  {
    key: "feather",
    group: "language",
    keywords: ["writing", "poetry", "literature", "feather"],
  },
  {
    key: "translate",
    group: "language",
    keywords: ["language", "foreign", "languages", "translation"],
  },
  {
    key: "text-aa",
    group: "language",
    keywords: ["text", "grammar", "font", "letters"],
  },
  {
    key: "quotes",
    group: "language",
    keywords: ["quotation", "citation", "speech", "literature"],
  },
  {
    key: "article",
    group: "language",
    keywords: ["essay", "document", "writing", "paper"],
  },
  {
    key: "chat-text",
    group: "language",
    keywords: ["speaking", "discussion", "dialogue", "language"],
  },
  // Humanities and history
  {
    key: "globe",
    group: "humanities",
    keywords: ["world", "geography", "international"],
  },
  {
    key: "globe-hemisphere-west",
    group: "humanities",
    keywords: ["world", "geography", "earth", "hemisphere"],
  },
  {
    key: "map-trifold",
    group: "humanities",
    keywords: ["geography", "cartography", "travel"],
  },
  {
    key: "compass",
    group: "humanities",
    keywords: ["navigation", "geography", "exploration"],
  },
  {
    key: "mountains",
    group: "humanities",
    keywords: ["geography", "geology", "landscape", "outdoors"],
  },
  {
    key: "scroll",
    group: "humanities",
    keywords: ["history", "ancient", "manuscript", "document"],
  },
  {
    key: "bank",
    group: "humanities",
    keywords: [
      "civics",
      "government",
      "history",
      "architecture",
      "columns",
      "bank",
    ],
  },
  {
    key: "crown",
    group: "humanities",
    keywords: ["monarchy", "history", "royalty"],
  },
  {
    key: "castle-turret",
    group: "humanities",
    keywords: ["medieval", "history", "architecture"],
  },
  {
    key: "newspaper",
    group: "humanities",
    keywords: ["journalism", "news", "media", "current", "events"],
  },
  {
    key: "hourglass",
    group: "humanities",
    keywords: ["time", "history", "timeline"],
  },
  {
    key: "anchor",
    group: "humanities",
    keywords: ["maritime", "naval", "history", "sea"],
  },
  // Arts and music
  {
    key: "paint-brush",
    group: "arts",
    keywords: ["art", "painting", "design"],
  },
  {
    key: "palette",
    group: "arts",
    keywords: ["art", "painting", "color", "design"],
  },
  {
    key: "paint-bucket",
    group: "arts",
    keywords: ["art", "color", "fill", "design"],
  },
  {
    key: "shapes",
    group: "arts",
    keywords: ["design", "art", "geometry", "graphic"],
  },
  { key: "scissors", group: "arts", keywords: ["craft", "collage", "cut"] },
  { key: "camera", group: "arts", keywords: ["photography", "photo", "media"] },
  {
    key: "film-slate",
    group: "arts",
    keywords: ["film", "cinema", "video", "production"],
  },
  {
    key: "mask-happy",
    group: "arts",
    keywords: ["drama", "theater", "acting", "performance"],
  },
  { key: "music-notes", group: "arts", keywords: ["music", "song", "melody"] },
  {
    key: "piano-keys",
    group: "arts",
    keywords: ["music", "keyboard", "instrument"],
  },
  { key: "guitar", group: "arts", keywords: ["music", "instrument", "band"] },
  {
    key: "microphone-stage",
    group: "arts",
    keywords: ["singing", "podcast", "performance", "voice"],
  },
  // Technology and code
  {
    key: "file-code",
    group: "technology",
    keywords: ["programming", "code", "software", "development", "source"],
  },
  {
    key: "terminal-window",
    group: "technology",
    keywords: ["command", "line", "shell", "programming"],
  },
  {
    key: "cpu",
    group: "technology",
    keywords: ["hardware", "computer", "engineering", "chip"],
  },
  {
    key: "circuitry",
    group: "technology",
    keywords: ["electronics", "engineering", "hardware"],
  },
  {
    key: "robot",
    group: "technology",
    keywords: ["ai", "robotics", "automation"],
  },
  {
    key: "database",
    group: "technology",
    keywords: ["data", "storage", "sql"],
  },
  {
    key: "cloud",
    group: "technology",
    keywords: ["cloud", "computing", "server", "hosting"],
  },
  {
    key: "laptop",
    group: "technology",
    keywords: ["computer", "device", "it"],
  },
  {
    key: "device-mobile",
    group: "technology",
    keywords: ["mobile", "app", "device"],
  },
  {
    key: "git-branch",
    group: "technology",
    keywords: ["version", "control", "programming", "source"],
  },
  {
    key: "bug",
    group: "technology",
    keywords: ["debugging", "software", "testing", "insect"],
  },
  {
    key: "shield-check",
    group: "technology",
    keywords: ["cybersecurity", "privacy", "protection"],
  },
  {
    key: "game-controller",
    group: "technology",
    keywords: ["games", "game", "design", "gaming"],
  },
  // Business and law
  {
    key: "briefcase",
    group: "business",
    keywords: ["business", "work", "career", "office"],
  },
  {
    key: "scales",
    group: "business",
    keywords: ["law", "justice", "legal", "ethics"],
  },
  {
    key: "gavel",
    group: "business",
    keywords: ["law", "court", "legal", "judge"],
  },
  {
    key: "handshake",
    group: "business",
    keywords: ["agreement", "partnership", "negotiation", "deal"],
  },
  {
    key: "buildings",
    group: "business",
    keywords: ["company", "office", "city", "corporate"],
  },
  {
    key: "storefront",
    group: "business",
    keywords: ["retail", "shop", "marketing", "small", "business"],
  },
  {
    key: "currency-dollar",
    group: "business",
    keywords: ["finance", "money", "economics"],
  },
  {
    key: "coins",
    group: "business",
    keywords: ["finance", "money", "economics"],
  },
  {
    key: "piggy-bank",
    group: "business",
    keywords: ["savings", "personal", "finance", "budget"],
  },
  {
    key: "chart-line-up",
    group: "business",
    keywords: ["finance", "stocks", "growth", "economics"],
  },
  {
    key: "megaphone",
    group: "business",
    keywords: ["marketing", "announcement", "communications"],
  },
  {
    key: "receipt",
    group: "business",
    keywords: ["accounting", "bookkeeping", "expenses"],
  },
  // Health and sport
  {
    key: "heartbeat",
    group: "health",
    keywords: ["health", "medicine", "cardiology", "pulse"],
  },
  {
    key: "first-aid-kit",
    group: "health",
    keywords: ["health", "medicine", "nursing", "emergency"],
  },
  {
    key: "stethoscope",
    group: "health",
    keywords: ["medicine", "doctor", "nursing", "health"],
  },
  { key: "pill", group: "health", keywords: ["pharmacy", "medicine", "drug"] },
  {
    key: "syringe",
    group: "health",
    keywords: ["medicine", "vaccine", "nursing"],
  },
  {
    key: "tooth",
    group: "health",
    keywords: ["dentistry", "dental", "health"],
  },
  {
    key: "brain",
    group: "health",
    keywords: ["psychology", "neuroscience", "mind"],
  },
  {
    key: "carrot",
    group: "health",
    keywords: ["nutrition", "food", "diet", "health"],
  },
  {
    key: "barbell",
    group: "health",
    keywords: ["fitness", "gym", "strength", "exercise"],
  },
  {
    key: "person-simple-run",
    group: "health",
    keywords: ["running", "exercise", "physical", "education"],
  },
  {
    key: "soccer-ball",
    group: "health",
    keywords: ["sport", "football", "team"],
  },
  {
    key: "basketball",
    group: "health",
    keywords: ["sport", "team", "physical", "education"],
  },
  // Campus and teaching
  {
    key: "graduation-cap",
    group: "campus",
    keywords: ["education", "degree", "school", "university"],
  },
  {
    key: "chalkboard",
    group: "campus",
    keywords: ["classroom", "teaching", "lesson"],
  },
  {
    key: "chalkboard-teacher",
    group: "campus",
    keywords: ["instructor", "lecture", "classroom"],
  },
  { key: "student", group: "campus", keywords: ["learner", "pupil", "class"] },
  { key: "users", group: "campus", keywords: ["class", "team", "people"] },
  {
    key: "users-three",
    group: "campus",
    keywords: ["class", "cohort", "team", "people"],
  },
  {
    key: "exam",
    group: "campus",
    keywords: ["test", "quiz", "assessment", "grade"],
  },
  {
    key: "certificate",
    group: "campus",
    keywords: ["diploma", "credential", "award", "course"],
  },
  { key: "backpack", group: "campus", keywords: ["school", "student", "bag"] },
  {
    key: "clipboard-text",
    group: "campus",
    keywords: ["assignment", "checklist", "homework"],
  },
  {
    key: "calendar-blank",
    group: "campus",
    keywords: ["schedule", "semester", "term", "dates"],
  },
  {
    key: "presentation-chart",
    group: "campus",
    keywords: ["lecture", "slides", "seminar"],
  },
  // General
  {
    key: "folder",
    group: "general",
    keywords: ["files", "project", "general"],
  },
  { key: "star", group: "general", keywords: ["favorite", "important"] },
  {
    key: "lightbulb",
    group: "general",
    keywords: ["idea", "insight", "innovation"],
  },
  { key: "rocket", group: "general", keywords: ["launch", "startup", "space"] },
  {
    key: "bookmark",
    group: "general",
    keywords: ["saved", "reference", "reading"],
  },
  {
    key: "puzzle-piece",
    group: "general",
    keywords: ["problem", "solving", "logic"],
  },
  { key: "target", group: "general", keywords: ["goal", "objective", "focus"] },
  {
    key: "trophy",
    group: "general",
    keywords: ["award", "competition", "achievement"],
  },
  {
    key: "flag",
    group: "general",
    keywords: ["milestone", "country", "marker"],
  },
  {
    key: "heart",
    group: "general",
    keywords: ["love", "favorite", "wellbeing"],
  },
  { key: "flame", group: "general", keywords: ["fire", "energy", "hot"] },
  { key: "sun", group: "general", keywords: ["weather", "day", "summer"] },
  {
    key: "coffee",
    group: "general",
    keywords: ["break", "cafe", "lounge"],
  },
];

/**
 * Tile colors, in display order. "accent" is the default: it follows the
 * brand accent and, like today's tiles, tints only the selected workspace.
 * Every other color tints its tile everywhere. Labels:
 * general.icon.colors.<key>; values: --ml-tile-<key> in index.css.
 */
export const WORKSPACE_TILE_COLORS = [
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
];

export const DEFAULT_TILE_COLOR = "accent";

const ICON_KEYS = new Set(WORKSPACE_ICONS.map((entry) => entry.key));
const COLOR_KEYS = new Set(WORKSPACE_TILE_COLORS);

/**
 * The library key to draw for a stored icon value, or null for initials
 * (null, "initials", or a key this build does not know).
 * @param {unknown} value
 * @returns {string|null}
 */
export function tileIconKey(value) {
  return typeof value === "string" && ICON_KEYS.has(value) ? value : null;
}

/**
 * The palette key for a stored color value, or null for the default accent
 * (null, "accent", or a key this build does not know).
 * @param {unknown} value
 * @returns {string|null}
 */
export function tileColorKey(value) {
  return typeof value === "string" &&
    COLOR_KEYS.has(value) &&
    value !== DEFAULT_TILE_COLOR
    ? value
    : null;
}

function normalize(text = "") {
  // Drop combining accents, so a search without them still matches.
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Icons matching every word of the query, in library order. A word matches
 * when the icon's label or key contains it or one of its keywords starts
 * with it. An empty query returns the whole library.
 * @param {string} query
 * @param {(key: string) => string} labelFor translated label for a key
 * @returns {{key: string, group: string, keywords: string[]}[]}
 */
export function searchWorkspaceIcons(query, labelFor = (key) => key) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return WORKSPACE_ICONS;
  return WORKSPACE_ICONS.filter((entry) => {
    const label = normalize(labelFor(entry.key));
    const keywords = entry.keywords.flatMap((keyword) => keyword.split(" "));
    return words.every(
      (word) =>
        label.includes(word) ||
        entry.key.includes(word) ||
        keywords.some((keyword) => keyword.startsWith(word))
    );
  });
}

/**
 * A starting icon for a workspace that switches from initials to an icon:
 * the library entry whose keywords best match a word of the workspace name
 * ("Intro to Ecology" -> leaf), otherwise the folder.
 * @param {string} name
 * @returns {string}
 */
export function suggestWorkspaceIcon(name = "") {
  const words = normalize(name)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 2);
  let best = null;
  for (const entry of WORKSPACE_ICONS) {
    for (const word of words) {
      // A key match wins, then the earliest matching keyword.
      const rank = entry.key === word ? 0 : entry.keywords.indexOf(word) + 1;
      if (rank === 0 && entry.key !== word) continue;
      if (!best || rank < best.rank) best = { key: entry.key, rank };
    }
  }
  return best?.key ?? "folder";
}
