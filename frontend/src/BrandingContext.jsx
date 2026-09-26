import {
  createContext,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Branding, {
  DEFAULT_APP_NAME,
  DEFAULT_BRAND,
  DEFAULT_TAGLINE,
  derivePageTitle,
  normalizeBrand,
} from "@/models/branding";
import { API_BASE } from "@/utils/constants";
import {
  applyBrandToDocument,
  readBrandCache,
  resolveAssetUrl,
  writeBrandCache,
} from "@/utils/branding/apply";
import {
  applyResolvedTheme,
  resolveTheme,
  setBrandDefaultTheme,
} from "@/utils/branding/theme";

/** Dispatch on window with `{detail: {brand}}` after any branding change. */
export const BRANDING_UPDATED_EVENT = "mission:branding-updated";
/** Cross-tab channel: a save in one tab updates every other open tab. */
export const BRANDING_CHANNEL = "mission-branding";
const REFETCH_THROTTLE_MS = 5000;

export const BrandingContext = createContext(null);

// First paint: apply the brand and the resolved theme before React renders.
// In production the server inlines the current brand in the page head
// (window.__MISSION_BRAND__, see server/utils/boot/MetaGenerator.js), which is
// fresher than the cache. In dev, index.html applies the cached brand inline
// and this repeats it.
const INITIAL_BRAND = (() => {
  const injected =
    typeof window !== "undefined" ? window.__MISSION_BRAND__ : null;
  if (injected && typeof injected === "object") return normalizeBrand(injected);
  const cached = readBrandCache();
  return cached ? normalizeBrand(cached) : DEFAULT_BRAND;
})();
try {
  setBrandDefaultTheme(INITIAL_BRAND.defaultTheme);
  applyResolvedTheme(resolveTheme());
  applyBrandToDocument(INITIAL_BRAND, API_BASE);
} catch {
  // Never block the app over a cosmetic first-paint step.
}

function hasOwn(obj, key) {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Overlays an unsaved draft on the saved brand.
 *
 * `preview` is a partial PublicBrand. Convenience forms are accepted too:
 * - `accent: {base, light}` without computed parts is computed here, the same
 *   way the server does it, and the accent css is rebuilt to match.
 * - `appName` / `tagline` alone also mark the value as custom, and the tab
 *   title follows them unless the saved brand has an explicit title.
 * - `banner.bg` without `fg` picks the readable text color.
 */
function mergePreview(saved, preview) {
  if (!preview || typeof preview !== "object") return saved;
  const next = { ...saved };

  for (const key of [
    "appName",
    "customAppName",
    "tagline",
    "customTagline",
    "defaultTheme",
  ]) {
    if (hasOwn(preview, key)) next[key] = preview[key];
  }
  if (hasOwn(preview, "appName") && !hasOwn(preview, "customAppName")) {
    const name = String(preview.appName ?? "").trim();
    next.customAppName = name && name !== DEFAULT_APP_NAME ? name : null;
    next.appName = name || DEFAULT_APP_NAME;
  }
  if (hasOwn(preview, "tagline") && !hasOwn(preview, "customTagline")) {
    const tagline = String(preview.tagline ?? "").trim();
    next.customTagline =
      tagline && tagline !== DEFAULT_TAGLINE ? tagline : null;
    next.tagline = tagline || DEFAULT_TAGLINE;
  }

  const savedTitleIsDerived =
    saved.pageTitle ===
    derivePageTitle({
      customAppName: saved.customAppName,
      customTagline: saved.customTagline,
      appName: saved.appName,
      tagline: saved.tagline,
    });
  if (hasOwn(preview, "pageTitle")) next.pageTitle = preview.pageTitle || null;
  else if (savedTitleIsDerived) next.pageTitle = null;
  if (!next.pageTitle)
    next.pageTitle = derivePageTitle({
      customAppName: next.customAppName,
      customTagline: next.customTagline,
      appName: next.appName,
      tagline: next.tagline,
    });

  if (preview.accent && typeof preview.accent === "object") {
    const a = preview.accent;
    next.accent = {
      base: hasOwn(a, "base") ? a.base : saved.accent.base,
      light: hasOwn(a, "light") ? a.light : saved.accent.light,
      // Computed parts are only kept when the draft supplies them; otherwise
      // normalizeBrand recomputes them from base and light.
      ...(a.dark && a.lightTheme
        ? { dark: a.dark, lightTheme: a.lightTheme }
        : {}),
    };
    next.css = hasOwn(preview, "css") ? preview.css : undefined;
  } else if (hasOwn(preview, "css")) {
    next.css = preview.css;
  }

  if (preview.banner && typeof preview.banner === "object") {
    next.banner = { ...saved.banner, ...preview.banner };
    if (hasOwn(preview.banner, "bg") && !hasOwn(preview.banner, "fg"))
      delete next.banner.fg;
  }
  if (preview.login && typeof preview.login === "object") {
    next.login = {
      ...saved.login,
      ...preview.login,
      notice: { ...saved.login.notice, ...(preview.login.notice || {}) },
    };
  }
  if (preview.assets && typeof preview.assets === "object")
    next.assets = { ...saved.assets, ...preview.assets };

  next.version = `${saved.version}+preview`;
  return normalizeBrand(next);
}

function openChannel() {
  try {
    return typeof BroadcastChannel === "function"
      ? new BroadcastChannel(BRANDING_CHANNEL)
      : null;
  } catch {
    return null;
  }
}

/**
 * Loads the instance branding (public GET /system/branding) and applies it to
 * the whole document: accent css, tab title, favicons, banner layout and the
 * default theme. Keeps every open tab in sync.
 */
export function BrandingProvider({ children }) {
  const [state, setState] = useState(() => ({
    brand: INITIAL_BRAND,
    ready: false,
    // False only when the server answers 404 (no branding endpoint), so the
    // logo can fall back to the legacy lookup.
    available: true,
  }));
  const [preview, setPreviewState] = useState(null);
  const lastFetchRef = useRef(0);
  const inflightRef = useRef(null);
  const channelRef = useRef(null);

  const accept = useCallback((raw, { broadcast = false } = {}) => {
    const brand = normalizeBrand(raw);
    writeBrandCache(brand, API_BASE);
    setState((prev) =>
      prev.ready &&
      prev.available &&
      prev.brand.version === brand.version &&
      JSON.stringify(prev.brand) === JSON.stringify(brand)
        ? prev
        : { brand, ready: true, available: true }
    );
    if (broadcast) {
      try {
        channelRef.current?.postMessage({ type: "updated", brand });
      } catch {
        // A closed channel only means other tabs refresh on focus instead.
      }
    }
    return brand;
  }, []);

  const refresh = useCallback(() => {
    if (inflightRef.current) return inflightRef.current;
    lastFetchRef.current = Date.now();
    inflightRef.current = Branding.fetch()
      .then(({ brand, available }) => {
        if (brand) return accept(brand);
        if (!available) {
          // The server has no branding support: defaults, and forget any
          // cached brand from another server.
          writeBrandCache(null);
          setState({ brand: DEFAULT_BRAND, ready: true, available: false });
          return DEFAULT_BRAND;
        }
        // Unreachable or an error: keep what is shown now.
        setState((prev) => (prev.ready ? prev : { ...prev, ready: true }));
        return null;
      })
      .finally(() => {
        inflightRef.current = null;
      });
    return inflightRef.current;
  }, [accept]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Same-tab updates (Branding settings saves), other tabs, and refocus.
  useEffect(() => {
    const channel = openChannel();
    channelRef.current = channel;

    const onUpdated = (e) => {
      const brand = e?.detail?.brand;
      if (brand && typeof brand === "object")
        accept(brand, { broadcast: true });
      else
        refresh().then((fresh) => {
          if (!fresh) return;
          try {
            channelRef.current?.postMessage({ type: "updated", brand: fresh });
          } catch {
            // See accept().
          }
        });
    };
    const onMessage = (e) => {
      const brand = e?.data?.brand;
      if (brand && typeof brand === "object") accept(brand);
      else refresh();
    };
    const onFocus = () => {
      if (document.visibilityState === "hidden") return;
      if (Date.now() - lastFetchRef.current < REFETCH_THROTTLE_MS) return;
      refresh();
    };

    window.addEventListener(BRANDING_UPDATED_EVENT, onUpdated);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    channel?.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener(BRANDING_UPDATED_EVENT, onUpdated);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      channel?.removeEventListener("message", onMessage);
      channel?.close();
      channelRef.current = null;
    };
  }, [accept, refresh]);

  const brand = useMemo(
    () => mergePreview(state.brand, preview),
    [state.brand, preview]
  );

  // Before paint, so a draft or a save never flashes the old values.
  useLayoutEffect(() => {
    applyBrandToDocument(brand, API_BASE);
    setBrandDefaultTheme(brand.defaultTheme);
  }, [brand]);

  const setPreview = useCallback((partial) => {
    setPreviewState(partial && typeof partial === "object" ? partial : null);
  }, []);

  const assetUrl = useCallback((path) => resolveAssetUrl(path, API_BASE), []);

  const value = useMemo(
    () => ({
      brand,
      savedBrand: state.brand,
      ready: state.ready,
      available: state.available,
      previewing: preview !== null,
      refresh,
      setPreview,
      assetUrl,
    }),
    [
      brand,
      state.brand,
      state.ready,
      state.available,
      preview,
      refresh,
      setPreview,
      assetUrl,
    ]
  );

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}
