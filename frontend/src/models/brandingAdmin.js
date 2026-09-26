import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";
import { BRANDING_UPDATED_EVENT } from "@/BrandingContext";
import System from "@/models/system";

/**
 * Admin client for the Branding page. Every call resolves to a plain object
 * and never throws. Each successful write announces the new public brand with
 * BRANDING_UPDATED_EVENT so the whole app (and other open tabs, through the
 * runtime) applies it right away.
 */

function announce(brand) {
  if (!brand) return;
  window.dispatchEvent(
    new CustomEvent(BRANDING_UPDATED_EVENT, { detail: { brand } })
  );
}

// Other screens cache these values in localStorage (sidebar footer links,
// support email, app name). Drop the caches so they refetch the saved values.
function clearLegacyCaches() {
  const keys = [
    System.cacheKeys.footerIcons,
    System.cacheKeys.supportEmail,
    System.cacheKeys.customAppName,
  ];
  for (const key of keys) {
    try {
      window.localStorage.removeItem(key);
    } catch {}
  }
}

async function send(path, { method = "GET", json, formData } = {}) {
  try {
    const headers = baseHeaders();
    if (json !== undefined) headers["Content-Type"] = "application/json";
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: json !== undefined ? JSON.stringify(json) : formData,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data: data || {} };
  } catch (e) {
    console.error(e);
    return { ok: false, status: 0, data: { error: "network_error" } };
  }
}

const BrandingAdmin = {
  /**
   * @returns {Promise<{values: object|null, defaults: object, limits: object, brand: object|null, error: string|null}>}
   */
  get: async function () {
    const { ok, status, data } = await send("/admin/branding");
    if (!ok)
      return {
        values: null,
        defaults: {},
        limits: {},
        brand: null,
        error: data?.error || `http_${status}`,
      };
    return {
      values: data.values || {},
      defaults: data.defaults || {},
      limits: data.limits || {},
      brand: data.brand || null,
      error: null,
    };
  },

  /**
   * Saves text, color and toggle fields in one request. Nothing is saved when
   * any field fails validation.
   * @param {Record<string, string>} values
   * @returns {Promise<{success: boolean, brand?: object, values?: object, errors?: Record<string, string>, error?: string}>}
   */
  save: async function (values) {
    const { ok, status, data } = await send("/admin/branding", {
      method: "POST",
      json: { values },
    });
    if (!ok || !data.success)
      return {
        success: false,
        errors: data?.errors || null,
        error: data?.error || `http_${status}`,
      };
    clearLegacyCaches();
    announce(data.brand);
    return { success: true, brand: data.brand, values: data.values };
  },

  /**
   * Uploads a logo or the app icon. Saves immediately.
   * @param {"logo-dark"|"logo-light"|"icon"} slot
   * @param {FormData} formData - field `file`, plus `icon-32`, `icon-180`, `icon-192`, `icon-512` for the icon
   * @returns {Promise<{success: boolean, brand?: object, error?: string, detail?: string|null}>}
   *   `detail` names the multipart field a failure is about (for example `icon-512`)
   */
  uploadAsset: async function (slot, formData) {
    const { ok, status, data } = await send(`/admin/branding/asset/${slot}`, {
      method: "POST",
      formData,
    });
    if (!ok || !data.success)
      return {
        success: false,
        error: data?.error || (status === 413 ? "too_large" : "upload_failed"),
        detail: typeof data?.detail === "string" ? data.detail : null,
      };
    announce(data.brand);
    return { success: true, brand: data.brand };
  },

  /**
   * Resets one asset slot to the built-in default.
   * @param {"logo-dark"|"logo-light"|"icon"} slot
   */
  removeAsset: async function (slot) {
    const { ok, status, data } = await send(`/admin/branding/asset/${slot}`, {
      method: "DELETE",
    });
    if (!ok || !data.success)
      return { success: false, error: data?.error || `http_${status}` };
    announce(data.brand);
    return { success: true, brand: data.brand };
  },

  /**
   * Restores every branding field and asset to its default. Admin only.
   * @param {{includeLinks: boolean}} options - also reset support email and sidebar footer links
   */
  reset: async function ({ includeLinks = false } = {}) {
    const { ok, status, data } = await send("/admin/branding/reset", {
      method: "POST",
      json: { confirm: "RESET", includeLinks: !!includeLinks },
    });
    if (!ok || !data.success)
      return { success: false, error: data?.error || `http_${status}` };
    clearLegacyCaches();
    announce(data.brand);
    return { success: true, brand: data.brand };
  },
};

export default BrandingAdmin;
