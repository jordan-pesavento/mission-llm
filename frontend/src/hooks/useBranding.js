import { useContext } from "react";
import { BrandingContext } from "@/BrandingContext";
import { DEFAULT_BRAND } from "@/models/branding";
import { API_BASE } from "@/utils/constants";
import { resolveAssetUrl } from "@/utils/branding/apply";

const FALLBACK = {
  brand: DEFAULT_BRAND,
  savedBrand: DEFAULT_BRAND,
  ready: false,
  available: true,
  previewing: false,
  refresh: async () => null,
  setPreview: () => {},
  assetUrl: (path) => resolveAssetUrl(path, API_BASE),
};

/**
 * Instance branding for the current page.
 *
 * @returns {{
 *   brand: typeof DEFAULT_BRAND,
 *   ready: boolean,
 *   refresh: () => Promise<object|null>,
 *   setPreview: (partialBrandOrNull: object|null) => void,
 *   assetUrl: (path: string|null|undefined) => string|null,
 *   savedBrand: typeof DEFAULT_BRAND,
 *   available: boolean,
 *   previewing: boolean,
 * }}
 * - `brand` is the effective brand, including any unsaved draft set with
 *   `setPreview`; `savedBrand` is the brand as saved on the server.
 * - `setPreview(null)` clears the draft.
 * - `assetUrl(path)` prefixes an API-relative asset path with API_BASE.
 */
export default function useBranding() {
  return useContext(BrandingContext) ?? FALLBACK;
}
