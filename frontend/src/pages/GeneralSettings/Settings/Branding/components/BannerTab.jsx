import { useTranslation } from "react-i18next";
import {
  SettingsRow,
  SettingsField,
  SettingsFieldError,
  SettingsSegmented,
  SettingsToggle,
  SET_INPUT,
  SET_FIELD_INVALID,
} from "@/components/SettingsPage";
import { BANNER_PRESETS, MAX_LENGTH, normalizeHex, readableOn } from "./form";
import { HexInput, errorMessage } from "./parts";

/**
 * Whether a banner text is one the presets may replace: empty, the default,
 * or another preset's marking. Text the admin wrote stays as it is.
 */
function isPresetText(text, defaultText) {
  const value = String(text || "")
    .trim()
    .toUpperCase();
  if (!value || value === String(defaultText || "").toUpperCase()) return true;
  return BANNER_PRESETS.some((preset) => preset.text === value);
}

export default function BannerTab({ form, setField, errors, defaults }) {
  const { t } = useTranslation();
  const current = normalizeHex(form.brand_banner_bg);

  // A preset sets the color and, unless the admin wrote their own text, the
  // matching marking, so the color and the words never disagree.
  function applyPreset(preset) {
    setField("brand_banner_bg", preset.hex);
    if (isPresetText(form.brand_banner_text, defaults?.brand_banner_text))
      setField("brand_banner_text", preset.text);
  }

  return (
    <>
      <SettingsRow
        title={t("customization.branding.banner.main.title")}
        description={t("customization.branding.banner.main.description")}
      >
        <SettingsToggle
          id="branding-banner-enabled"
          checked={form.brand_banner_enabled}
          onChange={(on) => setField("brand_banner_enabled", on)}
          label={t("customization.branding.banner.main.toggle")}
        />
        <SettingsField
          label={t("customization.branding.banner.main.text")}
          error={
            errors.brand_banner_text
              ? errorMessage(t, errors.brand_banner_text, "brand_banner_text")
              : null
          }
        >
          <input
            type="text"
            autoComplete="off"
            maxLength={MAX_LENGTH.brand_banner_text}
            value={form.brand_banner_text}
            aria-invalid={!!errors.brand_banner_text}
            onChange={(e) =>
              setField("brand_banner_text", e.target.value.toUpperCase())
            }
            className={`${SET_INPUT} ${SET_FIELD_INVALID} uppercase tracking-[0.06em]`}
          />
        </SettingsField>
      </SettingsRow>

      <SettingsRow
        title={t("customization.branding.banner.color.title")}
        description={t("customization.branding.banner.color.description")}
      >
        {/* Even rows: three presets per row where they fit, else two. */}
        <div className="[container-type:inline-size]">
          <div className="grid grid-cols-2 gap-2.5 max-w-[560px] [@container(min-width:500px)]:grid-cols-3">
            {BANNER_PRESETS.map((preset) => {
              const pressed = current === normalizeHex(preset.hex);
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={pressed}
                  title={preset.hex}
                  onClick={() => applyPreset(preset)}
                  style={{
                    background: preset.hex,
                    color: readableOn(preset.hex),
                  }}
                  className={`h-10 min-w-0 inline-flex items-center justify-center px-3.5 rounded-[12px] border-2 text-[13.5px] font-bold uppercase tracking-[0.12em] whitespace-nowrap cursor-pointer outline-none transition-transform duration-100 hover:-translate-y-px shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] focus-visible:shadow-[0_0_0_4px_var(--ml-accent-soft)] ${
                    pressed ? "border-ml-text" : "border-transparent"
                  }`}
                >
                  {t(`customization.branding.banner.presets.${preset.id}`)}
                </button>
              );
            })}
          </div>
        </div>
        <HexInput
          dot
          value={form.brand_banner_bg}
          onChange={(value) => setField("brand_banner_bg", value)}
          label={t("customization.branding.banner.color.hex")}
          invalid={!!errors.brand_banner_bg}
        />
        {errors.brand_banner_bg && (
          <SettingsFieldError>
            {errorMessage(t, errors.brand_banner_bg, "brand_banner_bg")}
          </SettingsFieldError>
        )}
      </SettingsRow>

      <SettingsRow
        title={t("customization.branding.banner.position.title")}
        description={t("customization.branding.banner.position.description")}
      >
        <SettingsSegmented
          label={t("customization.branding.banner.position.title")}
          value={form.brand_banner_position}
          onChange={(value) => setField("brand_banner_position", value)}
          options={[
            {
              value: "both",
              label: t("customization.branding.banner.position.both"),
            },
            {
              value: "top",
              label: t("customization.branding.banner.position.top"),
            },
          ]}
        />
      </SettingsRow>
    </>
  );
}
