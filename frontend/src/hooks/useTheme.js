import { useEffect, useSyncExternalStore } from "react";
import {
  applyResolvedTheme,
  getThemePreference,
  setThemeChoice,
  subscribeTheme,
  systemPrefersLight,
} from "@/utils/branding/theme";

const availableThemes = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

/**
 * @typedef {'system' | 'light' | 'dark'} ThemeOption
 */

/**
 * @typedef {Object} UseThemeResult
 * @property {ThemeOption} theme - The effective theme preference: the user's own choice, else the instance default from Branding, else "system".
 * @property {(newTheme: ThemeOption) => void} setTheme - Stores the user's explicit choice.
 * @property {{system: string, light: string, dark: string}} availableThemes - Map of theme keys to display names.
 * @property {boolean} isLight - Whether the resolved theme is light (explicitly or via system preference).
 */

function subscribeSystemTheme(onChange) {
  const mql = window.matchMedia?.("(prefers-color-scheme: light)");
  if (!mql) return () => {};
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * Determines the current theme of the application.
 * "system" follows the OS preference, "light" and "dark" force that mode.
 * Every caller shares one store, so a change made anywhere applies everywhere.
 * @returns {UseThemeResult}
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, getThemePreference);
  const systemLight = useSyncExternalStore(
    subscribeSystemTheme,
    systemPrefersLight
  );

  const resolvedTheme =
    theme === "system" ? (systemLight ? "light" : "dark") : theme;

  useEffect(() => {
    applyResolvedTheme(resolvedTheme);
  }, [resolvedTheme]);

  // In development, attach keybind combinations to toggle theme
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    function toggleOnKeybind(e) {
      if (e.metaKey && e.key === ".") {
        e.preventDefault();
        setThemeChoice(
          document.documentElement.getAttribute("data-theme") === "light"
            ? "dark"
            : "light"
        );
      }
    }
    document.addEventListener("keydown", toggleOnKeybind);
    return () => document.removeEventListener("keydown", toggleOnKeybind);
  }, []);

  /**
   * Stores the user's explicit theme choice. The choice wins over the
   * instance default set under Branding.
   * @param {ThemeOption} newTheme The new theme to set
   */
  function setTheme(newTheme) {
    setThemeChoice(newTheme);
  }

  return {
    theme,
    setTheme,
    availableThemes,
    isLight: resolvedTheme === "light",
  };
}
