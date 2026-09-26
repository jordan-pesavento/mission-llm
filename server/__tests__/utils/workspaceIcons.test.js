/* eslint-env jest */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const {
  WORKSPACE_ICON_KEYS,
  WORKSPACE_ICON_COLORS,
  WORKSPACE_ICON_INITIALS,
  WORKSPACE_ICON_DEFAULT_COLOR,
  workspaceIconError,
  workspaceIconColorError,
  normalizeWorkspaceIcon,
  normalizeWorkspaceIconColor,
} = require("../../utils/workspaceIcons");

const TILE_DIR = path.resolve(
  __dirname,
  "../../../frontend/src/components/WorkspaceTile"
);

/**
 * Load the frontend icon library (plain ESM data and helpers, no imports)
 * without a bundler: drop the `export` keywords and evaluate it in a sandbox.
 */
function loadFrontendLibrary() {
  const source = fs
    .readFileSync(path.join(TILE_DIR, "iconLibrary.js"), "utf8")
    .replace(/^export\s+(?=(const|function|let)\b)/gm, "");
  const sandbox = {};
  vm.runInNewContext(
    `${source}\n;globalThis.__library = { WORKSPACE_ICONS, WORKSPACE_TILE_COLORS };`,
    sandbox
  );
  return sandbox.__library;
}

/** Keys and components of WORKSPACE_ICON_COMPONENTS in icons.js. */
function loadFrontendComponentMap() {
  const source = fs.readFileSync(path.join(TILE_DIR, "icons.js"), "utf8");
  const importBlock =
    /import\s*\{([^}]*)\}\s*from\s*"@phosphor-icons\/react"/.exec(source);
  const imported = new Set(
    (importBlock ? importBlock[1] : "")
      .split(",")
      .map((name) =>
        name
          .trim()
          .split(/\s+as\s+/)
          .pop()
      )
      .filter(Boolean)
  );
  const mapBlock = /WORKSPACE_ICON_COMPONENTS\s*=\s*\{([^}]*)\}/.exec(source);
  const entries = [
    ...(mapBlock ? mapBlock[1] : "").matchAll(
      /(?:"([a-z0-9-]+)"|([a-z0-9]+))\s*:\s*([A-Za-z0-9_]+)/g
    ),
  ].map((m) => ({ key: m[1] || m[2], component: m[3] }));
  return { imported, entries };
}

describe("workspace icon allowlist", () => {
  it("has 100 to 140 unique kebab-case keys", () => {
    expect(WORKSPACE_ICON_KEYS.length).toBeGreaterThanOrEqual(100);
    expect(WORKSPACE_ICON_KEYS.length).toBeLessThanOrEqual(140);
    expect(new Set(WORKSPACE_ICON_KEYS).size).toBe(WORKSPACE_ICON_KEYS.length);
    for (const key of WORKSPACE_ICON_KEYS)
      expect(key).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(WORKSPACE_ICON_KEYS).not.toContain(WORKSPACE_ICON_INITIALS);
  });

  it("has 8 to 10 unique colors starting with the default accent", () => {
    expect(WORKSPACE_ICON_COLORS.length).toBeGreaterThanOrEqual(8);
    expect(WORKSPACE_ICON_COLORS.length).toBeLessThanOrEqual(10);
    expect(new Set(WORKSPACE_ICON_COLORS).size).toBe(
      WORKSPACE_ICON_COLORS.length
    );
    expect(WORKSPACE_ICON_COLORS[0]).toBe(WORKSPACE_ICON_DEFAULT_COLOR);
  });

  it("is frozen so nothing can widen it at runtime", () => {
    expect(Object.isFrozen(WORKSPACE_ICON_KEYS)).toBe(true);
    expect(Object.isFrozen(WORKSPACE_ICON_COLORS)).toBe(true);
  });

  it("accepts the defaults and every key, and stores defaults as null", () => {
    for (const value of [null, undefined, "", WORKSPACE_ICON_INITIALS]) {
      expect(workspaceIconError(value)).toBeNull();
      expect(normalizeWorkspaceIcon(value)).toBeNull();
    }
    for (const key of WORKSPACE_ICON_KEYS) {
      expect(workspaceIconError(key)).toBeNull();
      expect(normalizeWorkspaceIcon(key)).toBe(key);
    }
    for (const value of [null, undefined, "", WORKSPACE_ICON_DEFAULT_COLOR]) {
      expect(workspaceIconColorError(value)).toBeNull();
      expect(normalizeWorkspaceIconColor(value)).toBeNull();
    }
    for (const key of WORKSPACE_ICON_COLORS.slice(1)) {
      expect(workspaceIconColorError(key)).toBeNull();
      expect(normalizeWorkspaceIconColor(key)).toBe(key);
    }
  });

  it("rejects anything else with a readable message", () => {
    expect(workspaceIconError("LEAF")).toMatch(/Invalid workspace icon "LEAF"/);
    expect(workspaceIconError("x".repeat(500))).toHaveLength(
      workspaceIconError("x".repeat(64)).length
    );
    expect(workspaceIconError(1)).toMatch(
      /Invalid workspace icon \(a number\)/
    );
    expect(workspaceIconError({})).toMatch(/\(an object\)/);
    expect(workspaceIconColorError("blue")).toMatch(
      /Invalid workspace icon color "blue"\. Use null or one of: accent, /
    );
    expect(workspaceIconColorError(["teal"])).toMatch(/\(an array\)/);
  });
});

describe("frontend icon registry matches the server allowlist", () => {
  it("lists exactly the same icon keys in the same order", () => {
    const { WORKSPACE_ICONS } = loadFrontendLibrary();
    expect(WORKSPACE_ICONS.map((entry) => entry.key)).toEqual([
      ...WORKSPACE_ICON_KEYS,
    ]);
  });

  it("lists exactly the same colors", () => {
    const { WORKSPACE_TILE_COLORS } = loadFrontendLibrary();
    expect([...WORKSPACE_TILE_COLORS]).toEqual([...WORKSPACE_ICON_COLORS]);
  });

  it("maps every key to an imported Phosphor component", () => {
    const { imported, entries } = loadFrontendComponentMap();
    expect(entries.map((entry) => entry.key).sort()).toEqual(
      [...WORKSPACE_ICON_KEYS].sort()
    );
    for (const { key, component } of entries)
      expect({ key, imported: imported.has(component) }).toEqual({
        key,
        imported: true,
      });
  });
});
