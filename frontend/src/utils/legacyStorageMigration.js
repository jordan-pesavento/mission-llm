// rebrand:keep-start (this whole file reads pre-rebrand names on purpose)
/**
 * One-time migration of browser storage keys written by builds from before the
 * Mission LLM rename. Those builds used the upstream key prefixes, so without
 * this step every user would be signed out and lose saved UI preferences and
 * unsent prompt drafts after upgrading.
 *
 * Imported first in main.jsx so it runs before any other module reads storage.
 * A value already stored under the new key always wins over the legacy one.
 */
const LEGACY_KEY_PREFIXES = [
  ["anythingllm_", "missionllm_"],
  ["anythingllm-workspace-order", "missionllm-workspace-order"],
  ["anything_llm_menu_", "mission_llm_menu_"],
];

function migrateLegacyStorageKeys(storage) {
  const keys = [];
  for (let i = 0; i < storage.length; i++) keys.push(storage.key(i));

  for (const key of keys) {
    if (!key) continue;
    const match = LEGACY_KEY_PREFIXES.find(([legacy]) =>
      key.startsWith(legacy)
    );
    if (!match) continue;

    const [legacy, current] = match;
    const newKey = current + key.slice(legacy.length);
    if (storage.getItem(newKey) === null)
      storage.setItem(newKey, storage.getItem(key));
    storage.removeItem(key);
  }
}

try {
  migrateLegacyStorageKeys(window.localStorage);
} catch {
  // Storage can be unavailable (private mode, blocked site data). Nothing to migrate.
}
// rebrand:keep-end
