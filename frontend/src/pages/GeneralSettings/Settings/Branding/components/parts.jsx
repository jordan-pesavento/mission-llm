import { useEffect, useState } from "react";
import { CircleNotch } from "@phosphor-icons/react";
import { API_BASE } from "@/utils/constants";
import FitWordmark, {
  wordmarkParts,
  wordmarkWraps,
} from "@/components/BrandWordmark";
import { MAX_LENGTH, normalizeHex } from "./form";

/**
 * The theme the app is showing right now ("dark" or "light"), following the
 * data-theme attribute on <html>.
 */
export function useDocumentTheme() {
  const read = () =>
    document.documentElement.getAttribute("data-theme") === "light"
      ? "light"
      : "dark";
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(read()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  return theme;
}

/**
 * API-relative asset path -> URL the browser can load.
 */
export function assetSrc(path) {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * Letter-spaced wordmark with the last word in the accent text color. Like the
 * sidebar (RailBrand), a longer multi-word name wraps onto a second line,
 * shrinking to fit if it must, and never loses its accent word
 * (FitWordmark). `clamp={false}` lets it wrap onto as many lines as it needs.
 * `wrapClassName` sizes the wrapping wordmark (it fills that width).
 */
export function Wordmark({
  name,
  className = "",
  wrapClassName = "",
  accentColor = null,
  clamp = true,
}) {
  const [lead, last] = wordmarkParts(name);
  const accentClassName = `font-[650] ${accentColor ? "" : "text-ml-accent-text"}`;
  const accentStyle = accentColor ? { color: accentColor } : undefined;
  if (wordmarkWraps(name))
    return (
      <FitWordmark
        name={name}
        className={`ml-wordmark leading-[1.2] ${wrapClassName} ${className}`}
        accentClassName={accentClassName}
        accentStyle={accentStyle}
        maxLines={clamp ? 2 : null}
      />
    );
  return (
    <span className={`ml-wordmark min-w-0 leading-none truncate ${className}`}>
      {lead ? `${lead} ` : ""}
      <b className={accentClassName} style={accentStyle}>
        {last}
      </b>
    </span>
  );
}

/**
 * Accent text color the app would use on a fixed dark or light surface
 * (same mix as --ml-accent-text in index.css).
 */
export function accentTextOn(hex, surface) {
  const text = surface === "light" ? "#0B1528" : "#E9EFF9";
  return `color-mix(in srgb, ${hex} 72%, ${text})`;
}

// Hex inputs: monospace, 40px next to 40px swatches, 44px next to fields.
const HEX_FIELD =
  "block shrink-0 rounded-[12px] border border-[color:var(--ml-field-line)] bg-[var(--ml-field-bg)] text-ml-text font-mono text-[15px] uppercase placeholder:normal-case placeholder:text-ml-text-3 outline-none transition-[border-color,box-shadow] duration-150 focus:border-ml-accent-line focus:shadow-[0_0_0_4px_var(--ml-accent-soft)] aria-[invalid=true]:border-ml-bad aria-[invalid=true]:focus:border-ml-bad aria-[invalid=true]:focus:shadow-[0_0_0_4px_var(--ml-bad-soft)]";

/**
 * Hex color text input. With `dot`, a small chip of the color sits inside the
 * field (used where no swatch row shows the color).
 */
export function HexInput({
  value,
  onChange,
  label,
  size = "md",
  dot = false,
  invalid = false,
  describedBy,
  id,
}) {
  const hex = normalizeHex(value);
  const height = size === "lg" ? "h-field" : "h-10";
  return (
    <div className="relative shrink-0">
      {dot && (
        <span
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-[6px] shadow-[inset_0_0_0_1px_rgba(128,128,128,0.35)]"
          style={{ background: hex || "transparent" }}
        />
      )}
      <input
        id={id}
        type="text"
        inputMode="text"
        spellCheck={false}
        autoComplete="off"
        maxLength={7}
        aria-label={label}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        value={value}
        placeholder="#RRGGBB"
        onChange={(e) => onChange(e.target.value)}
        className={`${HEX_FIELD} ${height} ${dot ? "w-[150px] pl-[40px] pr-3" : "w-[132px] px-3.5"}`}
      />
    </div>
  );
}

/**
 * Spinner layer over an image while it uploads.
 */
export function BusyOverlay({ label }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="absolute inset-0 grid place-items-center bg-black/45"
    >
      <CircleNotch size={26} className="animate-spin text-white" />
    </div>
  );
}

/**
 * Message for a validation or upload error code.
 */
export function errorMessage(t, code, field) {
  const max = MAX_LENGTH[field];
  const known = {
    too_long: t("customization.branding.errors.too-long", { max }),
    invalid_chars: t("customization.branding.errors.invalid-chars"),
    invalid_hex: t("customization.branding.errors.invalid-hex"),
    invalid_color: t("customization.branding.errors.invalid-hex"),
    invalid_url: t("customization.branding.errors.invalid-url"),
    invalid_link: t("customization.branding.errors.invalid-link"),
    invalid_email: t("customization.branding.errors.invalid-email"),
    missing_url: t("customization.branding.errors.missing-url"),
    missing_icon: t("customization.branding.errors.missing-icon"),
    invalid_rows: t("customization.branding.errors.footer-rows"),
    invalid_json: t("customization.branding.errors.footer-rows"),
    too_many: t("customization.branding.errors.too-many"),
    invalid_choice: t("customization.branding.errors.invalid"),
    missing_file: t("customization.branding.errors.missing-file"),
    unsupported_type: t("customization.branding.errors.unsupported-type"),
    too_large: t("customization.branding.errors.too-large"),
    too_large_dimensions: t(
      "customization.branding.errors.too-large-dimensions"
    ),
    too_small:
      field === "icon"
        ? t("customization.branding.errors.icon-too-small")
        : t("customization.branding.errors.logo-too-small"),
    bad_aspect: t("customization.branding.errors.bad-aspect"),
    not_square: t("customization.branding.errors.not-square"),
    variant_too_large: t("customization.branding.errors.icon-too-detailed"),
    invalid_svg: t("customization.branding.errors.invalid-svg"),
    upload_failed: t("customization.branding.errors.upload-failed"),
  };
  return known[code] || t("customization.branding.errors.invalid");
}
