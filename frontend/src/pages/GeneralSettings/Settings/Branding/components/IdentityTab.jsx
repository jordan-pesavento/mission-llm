import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash, UploadSimple } from "@phosphor-icons/react";
import {
  SettingsRow,
  SettingsField,
  SettingsFieldError,
  SettingsSwatch,
  SET_INPUT,
  SET_FIELD_INVALID,
  SET_SBTN,
} from "@/components/SettingsPage";
import Emblem from "@/media/logo/mission-llm-icon.svg";
import { contrastBadge } from "@/utils/branding/accent";
import { ACCENT_SWATCHES, MAX_LENGTH, normalizeHex } from "./form";
import { ACCEPTED_IMAGE_TYPES } from "./images";
import {
  BusyOverlay,
  HexInput,
  Wordmark,
  accentTextOn,
  assetSrc,
  errorMessage,
} from "./parts";

const SBTN = `${SET_SBTN} disabled:opacity-50 disabled:cursor-default disabled:hover:border-ml-line-2`;

export default function IdentityTab({
  form,
  setField,
  errors,
  brand,
  accent,
  busy,
  assetErrors,
  onUpload,
  onRemove,
}) {
  const { t } = useTranslation();
  const fieldError = (key) =>
    errors[key] ? errorMessage(t, errors[key], key) : null;

  return (
    <>
      <SettingsRow
        title={t("customization.branding.identity.name.title")}
        description={t("customization.branding.identity.name.description")}
      >
        <SettingsField
          label={t("customization.branding.identity.name.name")}
          error={fieldError("custom_app_name")}
        >
          <input
            type="text"
            autoComplete="off"
            maxLength={MAX_LENGTH.custom_app_name}
            value={form.custom_app_name}
            aria-invalid={!!errors.custom_app_name}
            onChange={(e) => setField("custom_app_name", e.target.value)}
            className={`${SET_INPUT} ${SET_FIELD_INVALID}`}
          />
        </SettingsField>
        <SettingsField
          label={t("customization.branding.identity.name.tagline")}
          error={fieldError("brand_tagline")}
        >
          <input
            type="text"
            autoComplete="off"
            maxLength={MAX_LENGTH.brand_tagline}
            value={form.brand_tagline}
            aria-invalid={!!errors.brand_tagline}
            onChange={(e) => setField("brand_tagline", e.target.value)}
            className={`${SET_INPUT} ${SET_FIELD_INVALID}`}
          />
        </SettingsField>
      </SettingsRow>

      <SettingsRow
        title={t("customization.branding.identity.logo.title")}
        description={t("customization.branding.identity.logo.description")}
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
          <LogoCard
            slot="logo-dark"
            surface="dark"
            asset={brand?.assets?.logoDark}
            name={form.custom_app_name}
            accentHex={accent.dark.hex}
            busy={busy["logo-dark"]}
            onUpload={onUpload}
            onRemove={onRemove}
          />
          <LogoCard
            slot="logo-light"
            surface="light"
            asset={brand?.assets?.logoLight}
            name={form.custom_app_name}
            accentHex={accent.lightTheme.hex}
            busy={busy["logo-light"]}
            onUpload={onUpload}
            onRemove={onRemove}
          />
        </div>
        {assetErrors.logo && (
          <SettingsFieldError>{assetErrors.logo}</SettingsFieldError>
        )}
      </SettingsRow>

      <SettingsRow
        title={t("customization.branding.identity.icon.title")}
        description={t("customization.branding.identity.icon.description")}
      >
        <AppIcon
          icon={brand?.assets?.icon}
          busy={busy.icon}
          onUpload={onUpload}
          onRemove={onRemove}
        />
        {assetErrors.icon && (
          <SettingsFieldError>{assetErrors.icon}</SettingsFieldError>
        )}
      </SettingsRow>

      <SettingsRow
        title={t("customization.branding.identity.accent.title")}
        description={t("customization.branding.identity.accent.description")}
      >
        {/* The badge describes the color in the hex field (the dark theme
            accent) in both themes; per-theme results are on the Colors tab. */}
        <AccentPicker
          value={form.brand_accent}
          onChange={(value) => setField("brand_accent", value)}
          result={accent.dark}
          error={fieldError("brand_accent")}
        />
      </SettingsRow>
    </>
  );
}

function LogoCard({
  slot,
  surface,
  asset,
  name,
  accentHex,
  busy,
  onUpload,
  onRemove,
}) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const src = assetSrc(asset?.url);
  const custom = !!asset?.custom;
  const label =
    surface === "dark"
      ? t("customization.branding.identity.logo.dark")
      : t("customization.branding.identity.logo.light");
  const stage =
    surface === "dark"
      ? "bg-[#070D19] text-[#E9EFF9]"
      : "bg-[#F3F5F9] text-[#0B1528]";
  const note =
    src && !custom && asset?.inherited
      ? surface === "dark"
        ? t("customization.branding.identity.logo.using-light")
        : t("customization.branding.identity.logo.using-dark")
      : null;

  return (
    <div className="min-w-0 rounded-[14px] border border-ml-line-2 bg-ml-panel overflow-hidden">
      <div
        className={`relative h-[112px] flex items-center justify-center gap-3 px-5 border-b border-ml-line ${stage}`}
      >
        {src ? (
          // Definite height, automatic width: an SVG with only a viewBox has
          // no natural width and would otherwise depend on its container.
          <img
            src={src}
            alt={label}
            width={asset?.width || undefined}
            height={asset?.height || undefined}
            className="block h-[52px] w-auto max-w-full object-contain"
          />
        ) : (
          <>
            <img
              src={Emblem}
              alt=""
              aria-hidden="true"
              className="w-[38px] h-[38px] shrink-0"
            />
            {/* The sidebar's wordmark size and, for a long name, the width
                of the sidebar's wordmark, so a name wraps and shrinks here
                exactly as it does in the sidebar at every window width. */}
            <Wordmark
              name={name}
              className="text-[15.5px]"
              wrapClassName="grow-0 shrink basis-[var(--ml-rail-wordmark-w)]"
              accentColor={accentTextOn(accentHex, surface)}
            />
          </>
        )}
        {busy && <BusyOverlay label={t("customization.branding.uploading")} />}
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0 flex flex-col">
          <span className="min-w-0 truncate text-[14.5px] font-semibold text-ml-text">
            {label}
          </span>
          {note && (
            <span className="text-[13.5px] leading-[1.4] text-ml-text-3">
              {note}
            </span>
          )}
        </div>
        <div data-row={`${slot}-actions`} className="flex gap-1.5 shrink-0">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onUpload(slot, file);
            }}
          />
          <button
            type="button"
            className={SBTN}
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <UploadSimple size={16} aria-hidden="true" />
            {t("customization.branding.identity.logo.replace")}
          </button>
          <button
            type="button"
            className={`${SBTN} px-[9px]`}
            disabled={busy || !custom}
            aria-label={t("customization.branding.identity.logo.remove", {
              label,
            })}
            title={t("customization.branding.identity.logo.remove", { label })}
            onClick={() => onRemove(slot)}
          >
            <Trash size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

const ICON_PREVIEWS = [
  { size: 64, variant: ["192", "180", "512", "source"] },
  { size: 32, variant: ["32", "192", "512", "source"] },
  { size: 16, variant: ["32", "192", "512", "source"] },
];

/**
 * Whether the last child of a wrapping flex row has moved onto a line below
 * the first child.
 */
function useLastChildWrapped(rowRef) {
  const [wrapped, setWrapped] = useState(false);
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const check = () => {
      const first = row.firstElementChild;
      const last = row.lastElementChild;
      if (!first || !last) return;
      setWrapped(
        last.getBoundingClientRect().top > first.getBoundingClientRect().top + 1
      );
    };
    check();
    if (typeof ResizeObserver !== "function") return;
    const observer = new ResizeObserver(check);
    observer.observe(row);
    return () => observer.disconnect();
  }, [rowRef]);
  return wrapped;
}

function AppIcon({ icon, busy, onUpload, onRemove }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const rowRef = useRef(null);
  // Beside the previews the buttons are centered on the 84px tiles; once
  // they wrap below, they sit at the top of their own line.
  const actionsWrapped = useLastChildWrapped(rowRef);
  const custom = !!icon?.custom;
  const pick = (keys) => {
    if (!custom || !icon?.urls) return "/favicon.png";
    for (const key of keys) if (icon.urls[key]) return assetSrc(icon.urls[key]);
    return "/favicon.png";
  };

  return (
    <div ref={rowRef} className="flex flex-wrap items-start gap-[18px]">
      {ICON_PREVIEWS.map(({ size, variant }) => (
        <div key={size} className="flex flex-col items-center gap-2">
          <div className="relative w-[84px] h-[84px] grid place-items-center rounded-[12px] border border-ml-line-2 bg-ml-panel overflow-hidden">
            <img
              src={pick(variant)}
              alt=""
              aria-hidden="true"
              width={size}
              height={size}
              style={{ width: size, height: size }}
              className="object-contain"
            />
            {busy && size === 64 && (
              <BusyOverlay label={t("customization.branding.uploading")} />
            )}
          </div>
          <span className="font-mono text-[13.5px] font-medium text-ml-text-3">
            {t("customization.branding.identity.icon.size", { size })}
          </span>
        </div>
      ))}
      <div
        data-row="icon-actions"
        className={`flex items-center gap-1.5 ${actionsWrapped ? "" : "h-[84px]"}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onUpload("icon", file);
          }}
        />
        <button
          type="button"
          className={SBTN}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <UploadSimple size={16} aria-hidden="true" />
          {t("customization.branding.identity.icon.replace")}
        </button>
        <button
          type="button"
          className={`${SBTN} px-[9px]`}
          disabled={busy || !custom}
          aria-label={t("customization.branding.identity.icon.remove")}
          title={t("customization.branding.identity.icon.remove")}
          onClick={() => onRemove("icon")}
        >
          <Trash size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function AccentPicker({ value, onChange, result, error }) {
  const { t } = useTranslation();
  const current = normalizeHex(value);
  const badge = contrastBadge(result);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        {ACCENT_SWATCHES.map((swatch) => (
          <SettingsSwatch
            key={swatch.id}
            color={swatch.hex}
            label={`${t(`customization.branding.swatches.${swatch.id}`)} ${swatch.hex}`}
            pressed={current === normalizeHex(swatch.hex)}
            onClick={() => onChange(swatch.hex)}
          />
        ))}
        <HexInput
          value={value}
          onChange={onChange}
          label={t("customization.branding.identity.accent.hex")}
          invalid={!!error}
        />
        <span
          data-ok={badge.pass}
          className={`h-10 inline-flex items-center px-3 rounded-[12px] font-mono text-[14px] font-semibold whitespace-nowrap ${
            badge.pass
              ? "bg-ml-ok-soft text-[color:color-mix(in_srgb,var(--ml-ok)_78%,var(--ml-text))]"
              : "bg-ml-warn-soft text-[color:color-mix(in_srgb,var(--ml-warn)_78%,var(--ml-text))]"
          }`}
        >
          {badge.label}
        </span>
      </div>
      {error && <SettingsFieldError>{error}</SettingsFieldError>}
    </>
  );
}
