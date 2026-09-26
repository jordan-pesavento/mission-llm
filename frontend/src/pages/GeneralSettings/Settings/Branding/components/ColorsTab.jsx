import { useTranslation } from "react-i18next";
import {
  CheckCircle,
  Monitor,
  Moon,
  Sun,
  Warning,
} from "@phosphor-icons/react";
import {
  SettingsRow,
  SettingsFieldError,
  SettingsSegmented,
} from "@/components/SettingsPage";
import { accentFill, contrastBadge } from "@/utils/branding/accent";
import { displayHex } from "./form";
import { HexInput, errorMessage } from "./parts";

export default function ColorsTab({ form, setField, errors, accent }) {
  const { t } = useTranslation();

  return (
    <>
      <SettingsRow
        title={t("customization.branding.colors.theme.title")}
        description={t("customization.branding.colors.theme.description")}
      >
        <SettingsSegmented
          label={t("customization.branding.colors.theme.title")}
          value={form.brand_default_theme}
          onChange={(value) => setField("brand_default_theme", value)}
          options={[
            {
              value: "system",
              label: t("customization.branding.colors.theme.system"),
              icon: Monitor,
            },
            {
              value: "dark",
              label: t("customization.branding.colors.theme.dark"),
              icon: Moon,
            },
            {
              value: "light",
              label: t("customization.branding.colors.theme.light"),
              icon: Sun,
            },
          ]}
        />
      </SettingsRow>

      <SettingsRow
        title={t("customization.branding.colors.light-accent.title")}
        description={t(
          "customization.branding.colors.light-accent.description"
        )}
      >
        <div
          data-row="light-accent"
          className="flex flex-wrap items-center gap-2.5"
        >
          <SettingsSegmented
            label={t("customization.branding.colors.light-accent.title")}
            value={form.brand_accent_light_mode}
            onChange={(mode) => {
              setField("brand_accent_light_mode", mode);
              if (mode === "custom" && !form.brand_accent_light)
                setField(
                  "brand_accent_light",
                  displayHex(accent.lightTheme.hex)
                );
            }}
            options={[
              {
                value: "auto",
                label: t("customization.branding.colors.light-accent.auto"),
              },
              {
                value: "custom",
                label: t("customization.branding.colors.light-accent.custom"),
              },
            ]}
          />
          {form.brand_accent_light_mode === "custom" && (
            <HexInput
              size="lg"
              dot
              value={form.brand_accent_light}
              onChange={(value) => setField("brand_accent_light", value)}
              label={t("customization.branding.colors.light-accent.hex")}
              invalid={!!errors.brand_accent_light}
            />
          )}
        </div>
        {errors.brand_accent_light && (
          <SettingsFieldError>
            {errorMessage(t, errors.brand_accent_light, "brand_accent_light")}
          </SettingsFieldError>
        )}
      </SettingsRow>

      <SettingsRow
        title={t("customization.branding.colors.readability.title")}
        description={t("customization.branding.colors.readability.description")}
      >
        <div className="max-w-[760px] rounded-[14px] border border-ml-line-2 bg-ml-panel divide-y divide-[color:var(--ml-line)] [container-type:inline-size]">
          <ReadabilityLine
            label={t("customization.branding.colors.readability.dark")}
            result={accent.dark}
          />
          <ReadabilityLine
            label={t("customization.branding.colors.readability.light")}
            result={accent.lightTheme}
          />
        </div>
      </SettingsRow>
    </>
  );
}

// Readability status, on the same rule as the Identity contrast badge: the
// button text must reach AA (4.5:1). A color the app adjusted (and that now
// passes) gets a neutral note instead of a warning.
function readabilityStatus(t, result) {
  if (!contrastBadge(result).pass)
    return {
      key: "low-contrast",
      Icon: Warning,
      label: t("customization.branding.colors.readability.low-contrast"),
      tone: "text-[color:color-mix(in_srgb,var(--ml-warn)_78%,var(--ml-text))]",
    };
  if (result.adjusted)
    return {
      key: "adjusted",
      Icon: CheckCircle,
      label: t("customization.branding.colors.readability.adjusted"),
      tone: "text-ml-text-2",
    };
  return {
    key: "readable",
    Icon: CheckCircle,
    label: t("customization.branding.colors.readability.readable"),
    tone: "text-[color:color-mix(in_srgb,var(--ml-ok)_78%,var(--ml-text))]",
  };
}

// One line per theme. In a wide box (600px and up): theme | color | button
// text | status on one row. In a narrow box the theme and the status share the
// first row and the color and button text sit under them, so no part wraps on
// its own. (The head row becomes `display: contents` in the wide layout, so
// its two parts join the grid.)
function ReadabilityLine({ label, result }) {
  const { t } = useTranslation();
  const lightText = result.onAccent?.toLowerCase() === "#ffffff";
  const status = readabilityStatus(t, result);
  const { Icon } = status;
  return (
    <div
      data-status={status.key}
      className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 px-4 py-3 [@container(min-width:600px)]:grid-cols-[110px_auto_auto_minmax(0,1fr)]"
    >
      <div className="col-span-3 flex items-center justify-between gap-4 min-w-0 [@container(min-width:600px)]:contents">
        <span className="min-w-0 text-[15px] font-semibold text-ml-text [@container(min-width:600px)]:col-start-1 [@container(min-width:600px)]:row-start-1">
          {label}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 text-right text-[14.5px] font-semibold [@container(min-width:600px)]:col-start-4 [@container(min-width:600px)]:row-start-1 [@container(min-width:600px)]:justify-self-end ${status.tone}`}
        >
          <Icon size={17} aria-hidden="true" className="shrink-0" />
          {status.label}
        </span>
      </div>
      <span className="col-start-1 row-start-2 inline-flex items-center gap-2 font-mono text-[14.5px] font-medium text-ml-text whitespace-nowrap [@container(min-width:600px)]:col-start-2 [@container(min-width:600px)]:row-start-1">
        <span
          aria-hidden="true"
          className="w-5 h-5 shrink-0 rounded-[6px] shadow-[inset_0_0_0_1px_rgba(128,128,128,0.35)]"
          style={{ background: result.hex }}
        />
        {displayHex(result.hex)}
      </span>
      <span className="col-start-2 row-start-2 inline-flex items-center gap-2.5 whitespace-nowrap [@container(min-width:600px)]:col-start-3 [@container(min-width:600px)]:row-start-1">
        <span
          className="h-8 inline-flex items-center px-3 rounded-[9px] text-[14px] font-semibold"
          style={{
            background: accentFill(result.hex),
            color: result.onAccent,
          }}
        >
          {lightText
            ? t("customization.branding.colors.readability.light-text")
            : t("customization.branding.colors.readability.dark-text")}
        </span>
        <span className="font-mono text-[14.5px] font-medium text-ml-text-2">
          {`${Number(result.ratio).toFixed(1)}:1`}
        </span>
      </span>
    </div>
  );
}
