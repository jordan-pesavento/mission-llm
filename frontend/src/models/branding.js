import { API_BASE } from "@/utils/constants";
import {
  bannerForeground,
  buildAccentCss,
  computeAccent,
  isSafeBrandCss,
  normalizeHex,
} from "@/utils/branding/accent";

export const DEFAULT_APP_NAME = "Mission LLM";
export const DEFAULT_TAGLINE = "Sigmatech private AI platform";
export const DEFAULT_PAGE_TITLE = "Mission LLM | Private, self-hosted AI";
export const DEFAULT_FAVICON = "/favicon.png";
export const DEFAULT_NOTICE_HEADING = "Authorized use only";
export const DEFAULT_NOTICE_TEXT =
  "This system is for authorized users. Activity may be monitored and recorded. By signing in you agree to the acceptable use policy set by your administrator.";
export const DEFAULT_BANNER = {
  enabled: false,
  text: "UNCLASSIFIED",
  bg: "#007a33",
  fg: "#ffffff",
  position: "both",
};

const EMPTY_LOGO = {
  url: null,
  custom: false,
  inherited: false,
  width: null,
  height: null,
};

/**
 * The PublicBrand object used when nothing is customized (or the server has no
 * branding endpoint). Matches GET /system/branding for a fresh instance.
 */
export const DEFAULT_BRAND = Object.freeze({
  version: "default",
  appName: DEFAULT_APP_NAME,
  customAppName: null,
  tagline: DEFAULT_TAGLINE,
  customTagline: null,
  pageTitle: DEFAULT_PAGE_TITLE,
  defaultTheme: "system",
  accent: computeAccent({ base: null, light: null }),
  css: "",
  assets: {
    logoDark: { ...EMPTY_LOGO },
    logoLight: { ...EMPTY_LOGO },
    icon: { custom: false, urls: null },
    favicon: { url: DEFAULT_FAVICON, source: "default" },
  },
  login: {
    notice: {
      enabled: false,
      heading: DEFAULT_NOTICE_HEADING,
      text: DEFAULT_NOTICE_TEXT,
    },
    requireAck: false,
  },
  banner: { ...DEFAULT_BANNER },
});

const THEMES = ["system", "dark", "light"];

function str(value, fallback, max = 1000) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : fallback;
}

function optStr(value, max = 1000) {
  return str(value, null, max);
}

function bool(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function num(value) {
  return Number.isFinite(value) ? value : null;
}

function logoSlot(raw) {
  const slot = raw && typeof raw === "object" ? raw : {};
  return {
    url: typeof slot.url === "string" && slot.url ? slot.url : null,
    custom: bool(slot.custom),
    inherited: bool(slot.inherited),
    width: num(slot.width),
    height: num(slot.height),
  };
}

/**
 * The browser tab title rule: an explicit title wins, then "{name} | {tagline}"
 * when either is customized, else today's title.
 * @param {{pageTitle?: string|null, customAppName?: string|null, customTagline?: string|null, appName?: string, tagline?: string}} parts
 * @returns {string}
 */
export function derivePageTitle({
  pageTitle = null,
  customAppName = null,
  customTagline = null,
  appName = DEFAULT_APP_NAME,
  tagline = DEFAULT_TAGLINE,
} = {}) {
  if (pageTitle) return pageTitle;
  if (customAppName || customTagline)
    return `${customAppName || appName} | ${customTagline || tagline}`;
  return DEFAULT_PAGE_TITLE;
}

/**
 * Fills every field of a (possibly partial or older) PublicBrand payload with
 * safe defaults, so consumers never have to null-check nested fields.
 * @param {object|null|undefined} raw
 * @returns {typeof DEFAULT_BRAND}
 */
export function normalizeBrand(raw) {
  if (!raw || typeof raw !== "object") return DEFAULT_BRAND;
  const customAppName = optStr(raw.customAppName, 40);
  const customTagline = optStr(raw.customTagline, 80);
  const appName = str(raw.appName, customAppName || DEFAULT_APP_NAME, 40);
  const tagline = str(raw.tagline, customTagline || DEFAULT_TAGLINE, 80);

  const accentIn =
    raw.accent && typeof raw.accent === "object" ? raw.accent : {};
  const computed = computeAccent({
    base: accentIn.base,
    light: accentIn.light,
  });
  const accent = {
    ...computed,
    dark: accentPart(accentIn.dark, computed.dark),
    lightTheme: accentPart(accentIn.lightTheme, computed.lightTheme),
  };
  const css =
    typeof raw.css === "string" && isSafeBrandCss(raw.css)
      ? raw.css
      : buildAccentCss(accent);

  const assets = raw.assets && typeof raw.assets === "object" ? raw.assets : {};
  const icon =
    assets.icon && typeof assets.icon === "object" ? assets.icon : {};
  const favicon =
    assets.favicon && typeof assets.favicon === "object" ? assets.favicon : {};

  const login = raw.login && typeof raw.login === "object" ? raw.login : {};
  const notice =
    login.notice && typeof login.notice === "object" ? login.notice : {};
  const banner = raw.banner && typeof raw.banner === "object" ? raw.banner : {};
  const bannerBg = normalizeHex(banner.bg) || DEFAULT_BANNER.bg;

  return {
    version: str(raw.version, DEFAULT_BRAND.version, 64),
    appName,
    customAppName,
    tagline,
    customTagline,
    pageTitle: str(
      raw.pageTitle,
      derivePageTitle({ customAppName, customTagline, appName, tagline }),
      200
    ),
    defaultTheme: THEMES.includes(raw.defaultTheme)
      ? raw.defaultTheme
      : "system",
    accent,
    css,
    assets: {
      logoDark: logoSlot(assets.logoDark),
      logoLight: logoSlot(assets.logoLight),
      icon: {
        custom: bool(icon.custom),
        urls: icon.urls && typeof icon.urls === "object" ? icon.urls : null,
      },
      favicon: {
        url: str(favicon.url, DEFAULT_FAVICON, 2048),
        source: str(favicon.source, "default", 16),
      },
    },
    login: {
      notice: {
        enabled: bool(notice.enabled),
        heading: str(notice.heading, DEFAULT_NOTICE_HEADING, 60),
        text: str(notice.text, DEFAULT_NOTICE_TEXT, 1000),
      },
      // Same rule as the server: an acknowledgment needs a notice to acknowledge.
      requireAck: bool(login.requireAck) && bool(notice.enabled),
    },
    banner: {
      enabled: bool(banner.enabled),
      text: str(banner.text, DEFAULT_BANNER.text, 80),
      bg: bannerBg,
      fg: normalizeHex(banner.fg) || bannerForeground(bannerBg),
      position: banner.position === "top" ? "top" : "both",
    },
  };
}

function accentPart(raw, fallback) {
  if (!raw || typeof raw !== "object") return fallback;
  const hex = normalizeHex(raw.hex);
  const onAccent = normalizeHex(raw.onAccent);
  if (!hex || !onAccent || typeof raw.rgb !== "string") return fallback;
  if (!/^\d{1,3} \d{1,3} \d{1,3}$/.test(raw.rgb)) return fallback;
  return {
    hex,
    rgb: raw.rgb,
    onAccent,
    ratio: Number.isFinite(raw.ratio) ? raw.ratio : fallback.ratio,
    adjusted: bool(raw.adjusted),
  };
}

const Branding = {
  /**
   * GET /system/branding (public, no auth).
   * @returns {Promise<{brand: typeof DEFAULT_BRAND|null, available: boolean}>}
   *   `available` is false when the server has no branding endpoint (404) so
   *   callers can fall back to the legacy logo lookup.
   */
  fetch: async function () {
    try {
      const res = await fetch(`${API_BASE}/system/branding`, {
        method: "GET",
        cache: "no-cache",
      });
      if (res.status === 404) return { brand: null, available: false };
      if (!res.ok) return { brand: null, available: true };
      const data = await res.json();
      const raw =
        data?.brand && typeof data.brand === "object" ? data.brand : data;
      return { brand: normalizeBrand(raw), available: true };
    } catch {
      return { brand: null, available: true };
    }
  },
};

export default Branding;
