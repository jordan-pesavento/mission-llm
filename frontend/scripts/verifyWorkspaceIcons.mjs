/* global process, console */
// Checks the workspace tile library (src/components/WorkspaceTile):
// - the icon keys and colors match the server allowlist exactly, in order
//   (server/utils/workspaceIcons.js is the source of truth; the server test
//   server/__tests__/utils/workspaceIcons.test.js checks the same lists);
// - every key renders a real Phosphor component;
// - every icon, group and color has an English label (general.icon.*).
// Run from frontend/: node scripts/verifyWorkspaceIcons.mjs
import { createRequire } from "module";
import {
  WORKSPACE_ICONS,
  WORKSPACE_ICON_GROUPS,
  WORKSPACE_TILE_COLORS,
} from "../src/components/WorkspaceTile/iconLibrary.js";
import { WORKSPACE_ICON_COMPONENTS } from "../src/components/WorkspaceTile/icons.js";
import English from "../src/locales/en/common.js";

const require = createRequire(import.meta.url);
const server = require("../../server/utils/workspaceIcons.js");

const failures = [];
function expectSame(label, actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    const missing = expected.filter((key) => !actual.includes(key));
    const extra = actual.filter((key) => !expected.includes(key));
    failures.push(
      `${label} differ from the server (missing: ${missing.join(", ") || "none"}; extra: ${extra.join(", ") || "none"}; order may differ)`
    );
  }
}

const keys = WORKSPACE_ICONS.map((entry) => entry.key);
expectSame("Icon keys", keys, [...server.WORKSPACE_ICON_KEYS]);
expectSame(
  "Colors",
  [...WORKSPACE_TILE_COLORS],
  [...server.WORKSPACE_ICON_COLORS]
);

for (const entry of WORKSPACE_ICONS) {
  const Icon = WORKSPACE_ICON_COMPONENTS[entry.key];
  if (!Icon) failures.push(`No Phosphor component for "${entry.key}"`);
  if (!WORKSPACE_ICON_GROUPS.includes(entry.group))
    failures.push(`"${entry.key}" is in unknown group "${entry.group}"`);
  if (!entry.keywords?.length)
    failures.push(`"${entry.key}" has no search keywords`);
}
const extraComponents = Object.keys(WORKSPACE_ICON_COMPONENTS).filter(
  (key) => !keys.includes(key)
);
if (extraComponents.length)
  failures.push(`Components for unknown keys: ${extraComponents.join(", ")}`);

const labels = English.general?.icon ?? {};
for (const key of keys)
  if (!labels.names?.[key]) failures.push(`No English label for icon "${key}"`);
for (const group of WORKSPACE_ICON_GROUPS)
  if (!labels.groups?.[group])
    failures.push(`No English label for group "${group}"`);
for (const color of WORKSPACE_TILE_COLORS)
  if (!labels.colors?.[color])
    failures.push(`No English label for color "${color}"`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(
  `Workspace icons OK: ${keys.length} icons in ${WORKSPACE_ICON_GROUPS.length} groups and ${WORKSPACE_TILE_COLORS.length} colors match the server, each with a component and a label.`
);
