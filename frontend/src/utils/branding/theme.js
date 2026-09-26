/**
 * Theme preference store shared by every useTheme() caller, the branding
 * runtime and the index.html boot script (which repeats resolve() inline).
 *
 * Resolution order:
 * 1. missionllm_theme_choice, written only when the user picks a theme.
 * 2. The legacy `theme` key, only when it is "light" or "dark". Older builds
 *    wrote "system" on every mount, so only these two values were a real pick.
 * 3. The instance default theme from branding (brand.defaultTheme).
 * 4. "system".
 */

export const THEME_CHOICE_KEY = "missionllm_theme_choice";
export const LEGACY_THEME_KEY = "theme";
export const THEME_OPTIONS = ["system", "light", "dark"];

const listeners = new Set();
let brandDefault = null;

function safeGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode, blocked site data): the choice still
    // applies for this page view through the in-memory state below.
  }
}

let sessionChoice = null;

/**
 * The user's explicit choice, or null when they have not picked one.
 * @returns {"system"|"light"|"dark"|null}
 */
export function readThemeChoice() {
  const choice = safeGet(THEME_CHOICE_KEY);
  if (THEME_OPTIONS.includes(choice)) return choice;
  const legacy = safeGet(LEGACY_THEME_KEY);
  if (legacy === "light" || legacy === "dark") return legacy;
  return sessionChoice;
}

/**
 * The effective preference (a theme option, not yet resolved against the OS).
 * @returns {"system"|"light"|"dark"}
 */
export function getThemePreference() {
  return readThemeChoice() ?? brandDefault ?? "system";
}

/** Whether the OS asks for light. */
export function systemPrefersLight() {
  return !!window.matchMedia?.("(prefers-color-scheme: light)").matches;
}

/**
 * @param {"system"|"light"|"dark"} preference
 * @returns {"light"|"dark"}
 */
export function resolveTheme(preference = getThemePreference()) {
  if (preference === "light" || preference === "dark") return preference;
  return systemPrefersLight() ? "light" : "dark";
}

/**
 * Applies a resolved theme to the document (data-theme on <html> and the
 * `light` class the Tailwind light: variant keys on).
 * @param {"light"|"dark"} resolved
 */
export function applyResolvedTheme(resolved) {
  const root = document.documentElement;
  if (root.getAttribute("data-theme") !== resolved)
    root.setAttribute("data-theme", resolved);
  document.body?.classList.toggle("light", resolved === "light");
}

function emit() {
  listeners.forEach((listener) => listener());
}

/**
 * Stores an explicit user choice (UI Preferences, the account menu). Also
 * mirrors it to the legacy key, which a few utilities still read.
 * @param {"system"|"light"|"dark"} choice
 */
export function setThemeChoice(choice) {
  if (!THEME_OPTIONS.includes(choice)) return;
  sessionChoice = choice;
  safeSet(THEME_CHOICE_KEY, choice);
  safeSet(LEGACY_THEME_KEY, choice);
  emit();
}

/**
 * Sets the instance default from branding. Only matters for users who have
 * not picked a theme themselves.
 * @param {string|null|undefined} value
 */
export function setBrandDefaultTheme(value) {
  const next = THEME_OPTIONS.includes(value) ? value : null;
  if (next === brandDefault) return;
  brandDefault = next;
  emit();
}

/**
 * @param {() => void} listener
 * @returns {() => void} unsubscribe
 */
export function subscribeTheme(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// A choice made in another tab applies here too.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === THEME_CHOICE_KEY || e.key === LEGACY_THEME_KEY || !e.key)
      emit();
  });
}
