/**
 * Applies a PublicBrand to the document: the accent stylesheet, the tab title,
 * the favicon links and the system banner layout. Every step is idempotent and
 * a no-op when the value is already in place, so with no branding set the page
 * stays exactly as index.html and index.css render it.
 *
 * The index.html boot script repeats the cache part of this inline so the
 * first paint already has the brand.
 */
import { isSafeBrandCss } from "./accent";

export const BRAND_CACHE_KEY = "missionllm_brand_cache";
export const BRAND_STYLE_ID = "mission-brand";
export const BANNER_HEIGHT_PX = 26;
export const BANNER_ATTR = "data-ml-banner";

/**
 * @param {string|null|undefined} path
 * @param {string} apiBase
 * @returns {string|null}
 */
export function resolveAssetUrl(path, apiBase) {
  if (typeof path !== "string" || !path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (!path.startsWith("/")) return null;
  return `${apiBase}${path}`;
}

/**
 * Browser tab icon and touch icon hrefs for a brand.
 * favicon.url is absolute (source "url"), API-relative (source "upload" or
 * "icon") or the bundled /favicon.png (source "default").
 * @returns {{icon: string, appleTouch: string}}
 */
export function faviconHrefs(brand, apiBase) {
  const favicon = brand?.assets?.favicon || {};
  const url = typeof favicon.url === "string" ? favicon.url : "";
  let icon = "/favicon.png";
  if (/^https?:\/\//i.test(url)) icon = url;
  else if (
    url.startsWith("/") &&
    url !== "/favicon.png" &&
    favicon.source !== "default"
  )
    icon = resolveAssetUrl(url, apiBase) || icon;

  const touchPath = brand?.assets?.icon?.custom
    ? brand.assets.icon.urls?.["180"]
    : null;
  const appleTouch = resolveAssetUrl(touchPath, apiBase) || icon;
  return { icon, appleTouch };
}

export function applyBrandCss(css) {
  const safe = isSafeBrandCss(css) ? css || "" : "";
  let style = document.getElementById(BRAND_STYLE_ID);
  if (!style) {
    if (!safe) return;
    style = document.createElement("style");
    style.id = BRAND_STYLE_ID;
    document.head.appendChild(style);
  }
  if (style.textContent !== safe) style.textContent = safe;
}

export function applyTitle(title) {
  if (typeof title === "string" && title && document.title !== title)
    document.title = title;
}

export function applyFavicons({ icon, appleTouch }) {
  const set = (link, href) => {
    if (href && link.getAttribute("href") !== href)
      link.setAttribute("href", href);
  };
  const icons = document.querySelectorAll('link[rel~="icon"]');
  if (icons.length === 0 && icon) {
    const link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
    set(link, icon);
  }
  icons.forEach((link) => {
    // The type hint must match the file, so drop it rather than claim PNG
    // for an uploaded or remote icon of another format.
    if (link.getAttribute("href") !== icon) link.removeAttribute("type");
    set(link, icon);
  });
  document
    .querySelectorAll('link[rel="apple-touch-icon"]')
    .forEach((link) => set(link, appleTouch));
}

/**
 * Reserves space for the system banner: --ml-banner-top / --ml-banner-bottom
 * on <html> plus a data-ml-banner attribute that switches on the layout rules
 * in index.css. Removes all of it when the banner is off.
 * @param {{enabled: boolean, position: "both"|"top"}|null} banner
 */
export function applyBannerLayout(banner) {
  const root = document.documentElement;
  if (!banner?.enabled) {
    if (root.hasAttribute(BANNER_ATTR)) root.removeAttribute(BANNER_ATTR);
    root.style.removeProperty("--ml-banner-top");
    root.style.removeProperty("--ml-banner-bottom");
    return;
  }
  const position = banner.position === "top" ? "top" : "both";
  root.style.setProperty("--ml-banner-top", `${BANNER_HEIGHT_PX}px`);
  root.style.setProperty(
    "--ml-banner-bottom",
    position === "both" ? `${BANNER_HEIGHT_PX}px` : "0px"
  );
  if (root.getAttribute(BANNER_ATTR) !== position)
    root.setAttribute(BANNER_ATTR, position);
}

/**
 * Applies everything document-level for a brand.
 * @param {object} brand normalized PublicBrand
 * @param {string} apiBase
 */
export function applyBrandToDocument(brand, apiBase) {
  if (!brand) return;
  applyBrandCss(brand.css);
  applyTitle(brand.pageTitle);
  applyFavicons(faviconHrefs(brand, apiBase));
  applyBannerLayout(brand.banner);
}

/**
 * @returns {object|null} the cached raw brand, or null
 */
export function readBrandCache() {
  try {
    const raw = window.localStorage.getItem(BRAND_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && parsed.brand
      ? parsed.brand
      : null;
  } catch {
    return null;
  }
}

/**
 * Caches the brand for the next first paint. Stores the resolved icon hrefs
 * too, because the inline boot script cannot know the API base.
 */
export function writeBrandCache(brand, apiBase) {
  try {
    if (!brand) {
      window.localStorage.removeItem(BRAND_CACHE_KEY);
      return;
    }
    window.localStorage.setItem(
      BRAND_CACHE_KEY,
      JSON.stringify({ brand, hrefs: faviconHrefs(brand, apiBase) })
    );
  } catch {
    // Storage unavailable or full: the next load simply starts from defaults.
  }
}
