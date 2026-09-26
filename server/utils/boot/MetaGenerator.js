/**
 * @typedef MetaTagDefinition
 * @property {('link'|'meta'|'title')} tag - the type of meta tag element
 * @property {{string:string}|null} props - the inner key/values of a meta tag
 * @property {string|null} content - Text content to be injected between tags. If null self-closing.
 */

const DEFAULT_TITLE = "Mission LLM | Private, self-hosted AI";
const DEFAULT_FAVICON = "/favicon.png";
// Asset URLs in the brand are relative to the API base, which is /api when
// the server also serves the built frontend.
const API_BASE = "/api";
// brand.css is built only from validated channel numbers and hex colors.
const SAFE_BRAND_CSS = /^[:a-z0-9\-[\]=;{}#. ]*$/i;

// Runs before the first paint, right after window.__MISSION_BRAND__ is set:
// resolves the theme (the user's choice, then the legacy key when it is
// light or dark, then the instance default, then the OS) and reserves the
// system banner space. Mirrors the boot script in frontend/index.html, which
// only runs in development; the frontend runtime takes over once it loads.
const BOOT_SCRIPT = `(function () {
  var root = document.documentElement;
  var brand = window.__MISSION_BRAND__ || {};
  var options = ["system", "light", "dark"];
  function get(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }
  var pref = get("missionllm_theme_choice");
  if (options.indexOf(pref) < 0) {
    var legacy = get("theme");
    pref = legacy === "light" || legacy === "dark" ? legacy : null;
  }
  if (!pref && options.indexOf(brand.defaultTheme) >= 0)
    pref = brand.defaultTheme;
  if (!pref || pref === "system")
    pref =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
  root.setAttribute("data-theme", pref);
  var banner = brand.banner;
  if (banner && banner.enabled === true) {
    var both = banner.position !== "top";
    root.style.setProperty("--ml-banner-top", "26px");
    root.style.setProperty("--ml-banner-bottom", both ? "26px" : "0px");
    root.setAttribute("data-ml-banner", both ? "both" : "top");
  }
})();`;

/**
 * This class serves the index page in production, where the built frontend is served
 * by this server (it is unused in development, where Vite serves frontend/index.html).
 * It emulates SSR for the head of the SPA: title, description, favicon and
 * apple-touch-icon come from the instance brand (Settings > Branding), the accent CSS
 * is inlined as <style id="mission-brand"> so the first paint already uses it, the
 * brand object is handed to the app as window.__MISSION_BRAND__, and a boot script
 * applies the theme and the system banner space before the first paint.
 * The class is a singleton. The head is rebuilt whenever the brand version changes,
 * and `clearConfig()` forces a rebuild on the next render.
 */
class MetaGenerator {
  name = "MetaGenerator";

  /** @type {MetaGenerator|null} */
  static _instance = null;

  /** @type {MetaTagDefinition[]|null} */
  #customConfig = null;

  /** @type {string|null} brand version the current config was built from */
  #brandVersion = null;

  #defaultManifest = {
    name: "Mission LLM",
    short_name: "Mission LLM",
    display: "standalone",
    orientation: "portrait",
    start_url: "/",
    icons: [
      {
        src: DEFAULT_FAVICON,
        sizes: "any",
      },
    ],
  };

  constructor() {
    if (MetaGenerator._instance) return MetaGenerator._instance;
    MetaGenerator._instance = this;
  }

  #log(text, ...args) {
    console.log(`\x1b[36m[${this.name}]\x1b[0m ${text}`, ...args);
  }

  /** @returns {Promise<object|null>} the public brand, or null if it cannot be read */
  async #loadBrand() {
    try {
      const { getBrand } = require("../branding");
      return await getBrand();
    } catch (error) {
      this.#log(`could not read the brand: ${error.message}`);
      return null;
    }
  }

  #validUrl(faviconUrl = null) {
    if (faviconUrl === null) return DEFAULT_FAVICON;
    try {
      const url = new URL(faviconUrl);
      if (!["http:", "https:"].includes(url.protocol)) return DEFAULT_FAVICON;
      return url.toString();
    } catch {
      return DEFAULT_FAVICON;
    }
  }

  #faviconHref(brand) {
    const favicon = brand?.assets?.favicon;
    if (!favicon?.url || favicon.source === "default") return DEFAULT_FAVICON;
    if (favicon.source === "url") return this.#validUrl(favicon.url);
    return `${API_BASE}${favicon.url}`;
  }

  #appleTouchHref(brand) {
    const urls = brand?.assets?.icon?.urls;
    if (brand?.assets?.icon?.custom && urls?.["180"])
      return `${API_BASE}${urls["180"]}`;
    return this.#faviconHref(brand);
  }

  /**
   * @param {object|null} brand
   * @returns {MetaTagDefinition[]}
   */
  #brandMeta(brand) {
    const title = brand?.pageTitle || DEFAULT_TITLE;
    const description = brand?.customTagline || title;
    const appName = brand?.appName || "Mission LLM";
    return [
      { tag: "title", props: null, content: title },
      { tag: "meta", props: { name: "title", content: title } },
      { tag: "meta", props: { name: "description", content: description } },

      // <!-- Facebook -->
      { tag: "meta", props: { property: "og:type", content: "website" } },
      { tag: "meta", props: { property: "og:title", content: title } },
      {
        tag: "meta",
        props: { property: "og:description", content: description },
      },

      // <!-- Twitter -->
      {
        tag: "meta",
        props: { property: "twitter:card", content: "summary_large_image" },
      },
      { tag: "meta", props: { property: "twitter:title", content: title } },
      {
        tag: "meta",
        props: { property: "twitter:description", content: description },
      },

      { tag: "link", props: { rel: "icon", href: this.#faviconHref(brand) } },
      {
        tag: "link",
        props: { rel: "apple-touch-icon", href: this.#appleTouchHref(brand) },
      },

      // PWA specific tags
      {
        tag: "meta",
        props: { name: "mobile-web-app-capable", content: "yes" },
      },
      {
        tag: "meta",
        props: { name: "apple-mobile-web-app-capable", content: "yes" },
      },
      {
        tag: "meta",
        props: { name: "apple-mobile-web-app-title", content: appName },
      },
      {
        tag: "meta",
        props: {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
      },
      { tag: "link", props: { rel: "manifest", href: "/manifest.json" } },
    ];
  }

  /**
   * HTML-escapes a value for safe insertion into attribute values or text content.
   * Brand values (name, tagline, tab title, favicon URL) are operator-controlled but
   * must never be able to break out of the attribute or element context they land in.
   * @param {any} value
   * @returns {string}
   */
  #escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Assembles Meta tags as one large string
   * @returns {string}
   */
  #assembleMeta() {
    const output = [];
    for (const tag of this.#customConfig) {
      let htmlString;
      htmlString = `<${tag.tag} `;

      if (tag.props !== null) {
        for (const [key, value] of Object.entries(tag.props))
          htmlString += `${this.#escapeHtml(key)}="${this.#escapeHtml(value)}" `;
      }

      if (tag.content) {
        htmlString += `>${this.#escapeHtml(tag.content)}</${tag.tag}>`;
      } else {
        htmlString += `>`;
      }
      output.push(htmlString);
    }
    return output.join("\n");
  }

  /**
   * The accent CSS, emitted raw (it is not HTML-escaped, so it is checked
   * against the only characters the brand CSS builder can produce).
   * @param {object|null} brand
   * @returns {string}
   */
  #brandCss(brand) {
    const css = typeof brand?.css === "string" ? brand.css : "";
    if (!css || SAFE_BRAND_CSS.test(css)) return css;
    this.#log("brand css failed the allowlist check and was not inlined");
    return "";
  }

  /**
   * JSON for an inline <script>, with <, >, &, U+2028 and U+2029 escaped so the
   * value cannot close the script element or break the JavaScript string.
   * @param {object|null} brand
   * @returns {string}
   */
  #scriptJson(brand) {
    return JSON.stringify(brand ?? null)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
  }

  /**
   * Clears the current config so it is rebuilt on the next render.
   */
  clearConfig() {
    this.#customConfig = null;
  }

  /**
   *
   * @param {import('express').Response} response
   * @param {number} code
   */
  async generate(response, code = 200) {
    const brand = await this.#loadBrand();
    const version = brand?.version ?? null;
    if (this.#customConfig === null || version !== this.#brandVersion) {
      if (this.#customConfig !== null)
        this.#log(`brand changed, rebuilding head`);
      this.#customConfig = this.#brandMeta(brand);
      this.#brandVersion = version;
    }

    response.status(code).send(`
       <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            ${this.#assembleMeta()}
            <style id="mission-brand">${this.#brandCss(brand)}</style>
            <script>window.__MISSION_BRAND__=${this.#scriptJson(brand)};</script>
            <script>${BOOT_SCRIPT}</script>
            <script type="module" crossorigin src="/index.js"></script>
            <link rel="stylesheet" href="/index.css">
          </head>
          <body>
            <div id="root" class="h-screen"></div>
          </body>
        </html>`);
  }

  /**
   * Generates the manifest.json file for the PWA application on the fly, named
   * after the instance and using the uploaded app icon when there is one.
   * @param {import('express').Response} response
   */
  async generateManifest(response) {
    try {
      const { getBrand } = require("../branding");
      const brand = await getBrand();
      const icon = brand.assets.icon;
      const icons = icon.custom
        ? [192, 512].map((size) => ({
            src: `${API_BASE}${icon.urls[String(size)]}`,
            sizes: `${size}x${size}`,
            type: "image/png",
            purpose: "any",
          }))
        : [{ src: this.#faviconHref(brand), sizes: "any" }];

      const manifest = {
        name: brand.appName,
        short_name: brand.appName,
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons,
      };

      response
        .set("Cache-Control", "no-cache")
        .type("application/json")
        .status(200)
        .send(manifest)
        .end();
    } catch (error) {
      this.#log(`error generating manifest: ${error.message}`, error);
      response
        .type("application/json")
        .status(200)
        .send(this.#defaultManifest)
        .end();
    }
  }
}

module.exports.MetaGenerator = MetaGenerator;
