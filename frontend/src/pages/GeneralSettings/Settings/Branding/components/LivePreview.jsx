import { useTranslation } from "react-i18next";
import { ArrowUp, ShieldCheck } from "@phosphor-icons/react";
import Emblem from "@/media/logo/mission-llm-icon.svg";
import { accentFill } from "@/utils/branding/accent";
import { Wordmark, accentTextOn, assetSrc } from "./parts";

/**
 * Accent tokens for one theme, scoped to the preview card so it follows the
 * draft even before the draft is applied app-wide.
 */
function accentVars(result) {
  const accent = result.hex;
  return {
    "--ml-accent-rgb": result.rgb,
    "--ml-accent": accent,
    "--ml-on-accent": result.onAccent,
    "--ml-accent-fill": accentFill(accent),
    "--ml-accent-soft": `color-mix(in srgb, ${accent} 15%, transparent)`,
    "--ml-accent-line": `color-mix(in srgb, ${accent} 48%, transparent)`,
    "--ml-accent-text": `color-mix(in srgb, ${accent} 72%, var(--ml-text))`,
  };
}

/**
 * Small, faithful mock of the app (rail, chat pane, primary button) or, on the
 * Sign-in page tab, of the sign-in screen, drawn from the unsaved draft.
 */
export default function LivePreview({ draft, accent, theme, brand, mode }) {
  const { t } = useTranslation();
  const result = theme === "light" ? accent.lightTheme : accent.dark;
  const logo =
    theme === "light" ? brand?.assets?.logoLight : brand?.assets?.logoDark;
  const logoSrc = assetSrc(logo?.url);

  return (
    <aside
      aria-label={t("customization.branding.preview.title")}
      style={accentVars(result)}
      className="rounded-[16px] border border-ml-line-2 bg-ml-panel overflow-hidden shadow-ml"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-ml-line">
        <span className="text-[15.5px] font-[650] text-ml-text">
          {t("customization.branding.preview.title")}
        </span>
        <span className="font-mono text-[13.5px] font-medium text-ml-text-3">
          {theme === "light"
            ? t("customization.branding.preview.light")
            : t("customization.branding.preview.dark")}
        </span>
      </div>
      {mode === "sign-in" ? (
        <SignInMock draft={draft} accent={accent} brand={brand} />
      ) : (
        <>
          <AppMock logoSrc={logoSrc} />
          {/* App mode only: the sign-in mock has its own Sign in button. */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-ml-line">
            <span className="flex-1 font-mono text-[13.5px] font-medium text-ml-text-3">
              {t("customization.branding.preview.button")}
            </span>
            <span className="h-9 inline-flex items-center px-3.5 rounded-[12px] bg-ml-accent-fill text-ml-on-accent text-[14px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_20px_-10px_var(--ml-accent)]">
              {t("customization.branding.preview.sign-in")}
            </span>
          </div>
        </>
      )}
    </aside>
  );
}

// The mini rail shows the logo, or the emblem alone: the product name is
// already shown live in the real sidebar next to this page and in the logo
// cards, and a readable (13px) wordmark does not fit a rail this narrow.
function AppMock({ logoSrc }) {
  return (
    <div
      data-mini
      aria-hidden="true"
      className="grid grid-cols-[132px_minmax(0,1fr)] h-[250px] bg-ml-ground"
    >
      <div className="flex flex-col gap-[7px] px-2.5 py-3 bg-ml-rail border-r border-ml-line">
        <div className="flex items-center mb-1.5 min-w-0 h-5">
          <img
            src={logoSrc || Emblem}
            alt=""
            className={
              logoSrc
                ? "block h-5 w-auto max-w-full object-contain object-left"
                : "w-5 h-5 shrink-0"
            }
          />
        </div>
        <div className="h-[18px] rounded-[6px] bg-ml-accent-soft shadow-[inset_2px_0_0_var(--ml-accent)]" />
        <div className="h-[18px] rounded-[6px] bg-ml-raised-2" />
        <div className="h-[18px] rounded-[6px] bg-ml-raised-2" />
        <div className="h-[18px] w-[70%] rounded-[6px] bg-ml-raised-2" />
      </div>
      <div className="flex flex-col gap-[9px] p-3.5 min-w-0">
        <div className="self-end w-[62%] h-[30px] rounded-[10px_10px_4px_10px] bg-[color:color-mix(in_srgb,var(--ml-accent)_16%,var(--ml-panel))] border border-[color:color-mix(in_srgb,var(--ml-accent)_30%,transparent)]" />
        <div className="h-2 rounded-[4px] bg-ml-raised-2" />
        <div className="h-2 rounded-[4px] bg-ml-raised-2" />
        <div className="h-2 w-[64%] rounded-[4px] bg-ml-raised-2" />
        <div className="mt-auto h-10 flex items-center justify-end px-1.5 rounded-[11px] border border-ml-line-2 bg-ml-panel">
          <span className="w-[26px] h-[26px] grid place-items-center rounded-[8px] bg-ml-accent-fill text-ml-on-accent">
            <ArrowUp size={14} weight="bold" />
          </span>
        </div>
      </div>
    </div>
  );
}

function SignInMock({ draft, accent, brand }) {
  const { t } = useTranslation();
  const logoSrc = assetSrc(
    brand?.assets?.logoDark?.url || brand?.assets?.logoLight?.url
  );
  const noticeOn = draft.brand_login_notice_enabled;
  const ack = noticeOn && draft.brand_login_require_ack;
  const accentText = accentTextOn(accent.dark.hex, "dark");
  // Mini form fields on the same field tokens as the real sign-in form.
  const field =
    "h-7 rounded-[8px] border border-[color:var(--ml-field-line)] bg-[var(--ml-field-bg)]";

  return (
    <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] min-h-[250px] bg-ml-ground">
      <div
        className="relative flex flex-col gap-3 p-3.5 text-[#E9EFF9] border-r border-[rgba(150,172,212,0.13)] overflow-hidden"
        style={{
          backgroundColor: "#070F26",
          backgroundImage:
            "radial-gradient(120% 90% at 0% 100%, #102A5C 0%, #070F26 55%, #04070F 100%)",
        }}
      >
        <div
          data-mini
          aria-hidden="true"
          className="flex items-center gap-2 min-w-0"
        >
          {logoSrc ? (
            <img
              src={logoSrc}
              alt=""
              className="block h-6 w-auto max-w-full object-contain object-left"
            />
          ) : (
            <>
              <img src={Emblem} alt="" className="w-6 h-6 shrink-0" />
              {/* The sign-in page shows nowhere else on this page, so the
                  whole name is shown, on as many lines as it needs. */}
              <Wordmark
                name={draft.custom_app_name}
                className="text-[13px]"
                accentColor={accentText}
                clamp={false}
              />
            </>
          )}
        </div>
        <p className="-mt-1 text-[13px] leading-[1.45] text-[#AAB7CD] line-clamp-2 break-words">
          {draft.brand_tagline}
        </p>
        {noticeOn && (
          <div className="rounded-[10px] border border-[rgba(169,186,214,0.24)] bg-[rgba(10,18,36,0.55)] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[13px] font-[650] leading-snug">
              <ShieldCheck
                size={15}
                aria-hidden="true"
                className="shrink-0"
                style={{ color: accentText }}
              />
              <span className="min-w-0 break-words">
                {draft.brand_login_notice_heading}
              </span>
            </div>
            <p className="mt-1 text-[13px] leading-[1.45] text-[#C3CEE0] whitespace-pre-line break-words">
              {draft.brand_login_notice_text}
            </p>
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center gap-2 p-3.5 min-w-0">
        <div className="h-2.5 w-[46%] rounded-[4px] bg-ml-raised-2" />
        <div className={field} />
        <div className={field} />
        {ack && (
          <div className="flex items-start gap-1.5 text-[13px] leading-[1.35] text-ml-text-2">
            <span
              aria-hidden="true"
              className="mt-px w-3.5 h-3.5 shrink-0 rounded-[4px] border border-[color:var(--ml-field-line)] bg-[var(--ml-field-bg)]"
            />
            {t("customization.branding.preview.ack")}
          </div>
        )}
        <div className="h-7 rounded-[8px] bg-ml-accent-fill" />
      </div>
    </div>
  );
}
