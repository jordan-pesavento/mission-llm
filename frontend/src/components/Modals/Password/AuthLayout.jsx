import React, { forwardRef, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck, WarningCircle } from "@phosphor-icons/react";
import System from "@/models/system";
import useLogo from "@/hooks/useLogo";
import useBranding from "@/hooks/useBranding";
import { accentFill, mixHex } from "@/utils/branding/accent";
import FitWordmark, {
  wordmarkParts,
  wordmarkWraps,
} from "@/components/BrandWordmark";

// Sign-in panel wordmark type: letter-spaced Archivo, 24 to 34px.
const WORDMARK =
  "font-display font-[650] leading-[1.5] tracking-[0.07em] text-[length:clamp(24px,2.4vw,34px)] [font-stretch:125%]";

/**
 * Sign-in frame (concept 1): a navy brand panel on the left with the orbit
 * line art, emblem, wordmark, tagline and the optional sign-in notice, and the
 * form column on the right. Shared by the login, password recovery, invite
 * and SSO screens.
 *
 * The brand panel is navy in both themes; the form column follows the theme.
 * Name, tagline, logo, notice and accent come from Branding.
 */
export default function AuthLayout({ children }) {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-ml-ground text-ml-text">
      <main
        data-frame="auth"
        className="grid min-h-full grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
      >
        <BrandPanel />
        <section
          data-frame="auth-form"
          className="grid min-w-0 place-items-center p-[clamp(28px,5vw,72px)]"
        >
          <div className="w-full max-w-[440px]">{children}</div>
        </section>
      </main>
    </div>
  );
}

/**
 * Accent colors for the navy panel. The default accent keeps the concept's
 * exact blues; a custom accent is derived from the dark theme accent the same
 * way the app derives its accent text (72% accent over the light text).
 */
function panelColors(accent) {
  if (!accent?.base)
    return { text: "#7FA6FF", orbitFrom: "#5B95FF", orbitTo: "#1C4ED8" };
  const hex = accent.dark.hex;
  return {
    text: mixHex(hex, "#e9eff9", 0.72),
    orbitFrom: hex,
    orbitTo: accentFill(hex),
  };
}

function BrandPanel() {
  const { t } = useTranslation();
  const { loginLogo, isCustomLogo } = useLogo();
  const { brand } = useBranding();
  const [version, setVersion] = useState(null);
  const gradientId = `ml-orbit-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    let active = true;
    System.fetchAppVersion()
      .then((v) => active && setVersion(v || null))
      .catch(() => null);
    return () => {
      active = false;
    };
  }, []);

  // Wordmark: the product name in capitals with the last word in the accent,
  // so the default reads "MISSION LLM" and a custom name keeps the same shape.
  const [lead, lastWord] = wordmarkParts(brand.appName);
  // A longer multi-word name wraps onto a second line, shrinking to fit if it
  // must, and never loses its accent word (FitWordmark); short names keep the
  // single-line lockup.
  const wraps = wordmarkWraps(brand.appName);
  const tagline = brand.customTagline
    ? brand.tagline
    : t("login.tagline", { defaultValue: brand.tagline });
  const notice = brand.login.notice;
  const colors = panelColors(brand.accent);
  // The panel is navy in both themes, so it shows the dark theme logo (or the
  // light one when only that was uploaded). Its size gives the aspect ratio.
  const { logoDark, logoLight } = brand.assets;
  const panelLogo = logoDark.url ? logoDark : logoLight;

  return (
    <section
      data-frame="auth-brand"
      className="relative flex min-w-0 flex-col justify-between gap-8 overflow-hidden border-r border-[rgba(150,172,212,0.13)] p-[clamp(28px,5vw,72px)] text-[#E9EFF9]"
      style={{
        backgroundColor: "#070F26",
        backgroundImage:
          "radial-gradient(120% 90% at 0% 100%, #102A5C 0%, #070F26 55%, #04070F 100%)",
      }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 900 900"
        className="pointer-events-none absolute aspect-square h-auto opacity-[0.55]"
        style={{ right: "-18%", bottom: "-22%", width: "min(900px, 95%)" }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={colors.orbitFrom} />
            <stop offset="1" stopColor={colors.orbitTo} />
          </linearGradient>
        </defs>
        <g transform="rotate(-24 450 450)">
          <ellipse
            cx="450"
            cy="450"
            rx="430"
            ry="160"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="1.6"
          />
          <circle cx="880" cy="450" r="7" fill={colors.orbitFrom} />
          <ellipse
            cx="450"
            cy="450"
            rx="330"
            ry="118"
            fill="none"
            stroke="#9FB2D0"
            strokeWidth="1"
            opacity="0.35"
          />
        </g>
      </svg>

      {isCustomLogo && loginLogo ? (
        // A custom logo replaces the emblem and the wordmark (the name is in
        // the logo), with the tagline under it. A definite height with
        // automatic width keeps an SVG that has only a viewBox visible.
        <div className="relative min-w-0">
          <img
            src={loginLogo}
            alt={brand.appName}
            width={panelLogo?.width || undefined}
            height={panelLogo?.height || undefined}
            className="block h-[72px] w-auto max-w-[min(360px,100%)] object-contain object-left"
          />
          <p className="mt-3 text-[18px] leading-[1.5] text-[#AAB7CD]">
            {tagline}
          </p>
        </div>
      ) : (
        <div className="relative flex min-w-0 items-center gap-[18px]">
          <img
            src={loginLogo}
            alt=""
            className="h-[72px] w-[72px] shrink-0 object-contain"
          />
          <div className={`min-w-0 ${wraps ? "flex-1" : ""}`}>
            {wraps ? (
              <FitWordmark
                name={brand.appName}
                as="div"
                className={WORDMARK}
                accentAs="span"
                accentStyle={{ color: colors.text }}
                minSize={20}
              />
            ) : (
              <div
                className={`${WORDMARK} whitespace-nowrap overflow-hidden text-ellipsis`}
              >
                {lead && `${lead} `}
                <span style={{ color: colors.text }}>{lastWord}</span>
              </div>
            )}
            <p className="mt-1 text-[18px] leading-[1.5] text-[#AAB7CD]">
              {tagline}
            </p>
          </div>
        </div>
      )}

      {notice.enabled && (
        <div
          data-frame="auth-notice"
          className="relative max-w-[560px] rounded-[16px] border border-[rgba(169,186,214,0.24)] bg-[rgba(10,18,36,0.55)] px-[22px] py-5 backdrop-blur-[6px]"
        >
          <p className="flex items-center gap-2.5 text-[17px] font-[650] leading-[1.5]">
            <ShieldCheck
              size={22}
              aria-hidden="true"
              className="shrink-0"
              style={{ color: colors.text }}
            />
            <span className="min-w-0 break-words">{notice.heading}</span>
          </p>
          <p className="mt-2 whitespace-pre-line break-words text-[16px] leading-[1.6] text-[#C3CEE0]">
            {notice.text}
          </p>
        </div>
      )}

      {version && (
        <p className="relative font-mono text-[13.5px] font-medium text-[#8B99B1]">
          Mission LLM {version} &middot;{" "}
          {t("login.self-hosted", { defaultValue: "self-hosted" })}
        </p>
      )}
    </section>
  );
}

/** Form stack with the concept's 18px rhythm. */
export function AuthForm({ children, className = "", ...props }) {
  return (
    <form {...props} className={`flex w-full flex-col gap-[18px] ${className}`}>
      {children}
    </form>
  );
}

/** "Sign in" heading and the muted line under it. */
export function AuthHeading({ id, title, subtitle }) {
  return (
    <>
      <h1
        id={id}
        className="font-display text-[32px] font-[650] leading-[1.5] tracking-[0.01em] text-ml-text [font-stretch:112%]"
      >
        {title}
      </h1>
      {subtitle && (
        <p className="-mt-[10px] text-[16.5px] leading-[1.5] text-ml-text-2">
          {subtitle}
        </p>
      )}
    </>
  );
}

/** 50px text field: panel fill, line-2 hairline, accent border plus soft ring on focus. */
export const AUTH_FIELD =
  "h-[50px] w-full rounded-[12px] border border-ml-line-2 bg-ml-panel px-[14px] text-[17px] text-ml-text placeholder:text-ml-text-3 outline-none transition-[border-color,box-shadow] duration-150 ease-ml focus:border-ml-accent-line focus:shadow-[0_0_0_4px_var(--ml-accent-soft)]";

export const AuthInput = forwardRef(function AuthInput(
  { className = "", ...props },
  ref
) {
  return (
    <input ref={ref} {...props} className={`${AUTH_FIELD} ${className}`} />
  );
});

/** Label above its control (15px semibold), with an optional hint below. */
export function AuthField({ id, label, hint, children }) {
  return (
    <div className="flex flex-col gap-y-2">
      <label
        htmlFor={id}
        className="text-[15px] font-semibold leading-[1.5] text-ml-text"
      >
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[13.5px] leading-[1.45] text-ml-text-3">{hint}</p>
      )}
    </div>
  );
}

/** Full-width 48px primary button in the accent fill. */
export function AuthButton({
  children,
  busy = false,
  className = "",
  ...props
}) {
  return (
    <button
      {...props}
      aria-busy={busy || undefined}
      className={`inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-[12px] border border-transparent bg-ml-accent-fill px-4 text-base font-semibold text-ml-on-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_20px_-10px_var(--ml-accent)] transition-[filter,opacity] duration-150 ease-ml hover:brightness-105 disabled:hover:brightness-100 ${busy ? "disabled:cursor-wait" : "disabled:cursor-not-allowed disabled:opacity-70"} ${className}`}
    >
      {children}
    </button>
  );
}

/** Centered accent text action (Forgot password?, Back to Login). */
export function AuthLink({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`self-center rounded-md border-none bg-transparent text-[15px] font-semibold leading-[1.5] text-ml-accent-text underline-offset-4 hover:underline ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * "I have read and agree to the notice" checkbox, shown when Branding requires
 * an acknowledgment before sign-in. The form keeps Sign in disabled until it
 * is ticked.
 */
export function AuthAck({ id, checked, onChange }) {
  const { t } = useTranslation();
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-x-3 text-[15px] leading-[1.5] text-ml-text"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-[3px] h-[18px] w-[18px] shrink-0 cursor-pointer accent-[var(--ml-accent)]"
      />
      <span>
        {t("login.acknowledge-notice", {
          defaultValue: "I have read and agree to the notice",
        })}
      </span>
    </label>
  );
}

/** Inline error message for a failed sign-in, recovery or invite. */
export function AuthAlert({ id, children }) {
  return (
    <div
      id={id}
      role="alert"
      className="flex items-start gap-x-2.5 rounded-[12px] border border-ml-bad/40 bg-ml-bad-soft px-[14px] py-3 text-[15px] leading-[1.5] text-ml-text"
    >
      <WarningCircle
        size={20}
        weight="bold"
        className="mt-px shrink-0 text-ml-bad"
        aria-hidden="true"
      />
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}
