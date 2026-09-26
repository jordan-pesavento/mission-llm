import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X } from "@phosphor-icons/react";
import { ICON_COMPONENTS } from "@/components/Footer";
import {
  SettingsRow,
  SettingsField,
  SettingsFieldError,
  SET_INPUT,
  SET_FIELD_INVALID,
} from "@/components/SettingsPage";
import { EMPTY_ICON } from "./form";
import { errorMessage } from "./parts";

export default function AdvancedTab({
  form,
  setField,
  errors,
  footerRowErrors,
  defaultTitle,
}) {
  const { t } = useTranslation();
  const fieldError = (key) =>
    errors[key] ? errorMessage(t, errors[key], key) : null;
  const [faviconBroken, setFaviconBroken] = useState(false);
  const favicon = form.meta_page_favicon.trim();

  useEffect(() => setFaviconBroken(false), [favicon]);

  return (
    <>
      <SettingsRow
        title={t("customization.branding.advanced.title.title")}
        description={t("customization.branding.advanced.title.description")}
      >
        <SettingsField error={fieldError("meta_page_title")}>
          <input
            type="text"
            autoComplete="off"
            aria-label={t("customization.branding.advanced.title.label")}
            value={form.meta_page_title}
            placeholder={defaultTitle}
            aria-invalid={!!errors.meta_page_title}
            onChange={(e) => setField("meta_page_title", e.target.value)}
            className={`${SET_INPUT} ${SET_FIELD_INVALID}`}
          />
        </SettingsField>
      </SettingsRow>

      <SettingsRow
        title={t("customization.branding.advanced.favicon.title")}
        description={t("customization.branding.advanced.favicon.description")}
      >
        <SettingsField error={fieldError("meta_page_favicon")}>
          <div data-row="favicon" className="flex items-center gap-2.5">
            <span className="w-field h-field shrink-0 grid place-items-center rounded-[12px] border border-[color:var(--ml-field-line)] bg-[var(--ml-field-bg)] overflow-hidden">
              {favicon && !faviconBroken && /^https?:\/\//i.test(favicon) ? (
                <img
                  src={favicon}
                  alt=""
                  aria-hidden="true"
                  referrerPolicy="no-referrer"
                  onError={() => setFaviconBroken(true)}
                  className="w-6 h-6 object-contain"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="w-6 h-6 rounded-[6px] border border-dashed border-ml-line-2"
                />
              )}
            </span>
            <input
              type="url"
              autoComplete="off"
              inputMode="url"
              aria-label={t("customization.branding.advanced.favicon.label")}
              value={form.meta_page_favicon}
              placeholder="https://"
              aria-invalid={!!errors.meta_page_favicon}
              onChange={(e) => setField("meta_page_favicon", e.target.value)}
              className={`${SET_INPUT} ${SET_FIELD_INVALID} flex-1 min-w-0`}
            />
          </div>
        </SettingsField>
      </SettingsRow>

      <SettingsRow
        title={t("customization.branding.advanced.support.title")}
        description={t("customization.branding.advanced.support.description")}
      >
        <SettingsField error={fieldError("support_email")}>
          <input
            type="email"
            autoComplete="off"
            aria-label={t("customization.branding.advanced.support.label")}
            value={form.support_email}
            placeholder="support@example.com"
            aria-invalid={!!errors.support_email}
            onChange={(e) => setField("support_email", e.target.value)}
            className={`${SET_INPUT} ${SET_FIELD_INVALID}`}
          />
        </SettingsField>
      </SettingsRow>

      <SettingsRow
        title={t("customization.branding.advanced.footer.title")}
        description={t("customization.branding.advanced.footer.description")}
      >
        <div className="flex gap-x-2.5 text-[14.5px] font-semibold text-ml-text-2">
          <span className="w-field shrink-0">
            {t("customization.branding.advanced.footer.icon")}
          </span>
          <span>{t("customization.branding.advanced.footer.link")}</span>
        </div>
        {form.footer_data.map((row, index) => (
          <FooterLinkRow
            key={index}
            index={index}
            row={row}
            errorCode={footerRowErrors[index] || null}
            onChange={(next) =>
              setField(
                "footer_data",
                form.footer_data.map((item, i) => (i === index ? next : item))
              )
            }
          />
        ))}
        {errors.footer_data && !footerRowErrors.some(Boolean) && (
          <SettingsFieldError>
            {errorMessage(t, errors.footer_data, "footer_data")}
          </SettingsFieldError>
        )}
      </SettingsRow>
    </>
  );
}

function FooterLinkRow({ index, row, errorCode, onChange }) {
  const { t } = useTranslation();
  const error = errorCode ? errorMessage(t, errorCode, "footer_data") : null;
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const empty = row.icon === EMPTY_ICON && !row.url;
  const IconComponent = ICON_COMPONENTS[row.icon] || Plus;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="flex flex-col gap-1.5">
      <div
        data-row={`footer-link-${index}`}
        className="flex items-center gap-x-2.5"
      >
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            aria-label={t("customization.branding.advanced.footer.choose-icon")}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className={`w-field h-field grid place-items-center rounded-[12px] border bg-[var(--ml-field-bg)] cursor-pointer transition-colors duration-150 hover:border-ml-accent-line ${
              errorCode === "missing_icon"
                ? "border-ml-bad"
                : "border-[color:var(--ml-field-line)]"
            }`}
          >
            {React.createElement(IconComponent, {
              className: "h-5 w-5",
              weight: row.icon === EMPTY_ICON ? "bold" : "fill",
              color: "var(--theme-sidebar-footer-icon-fill)",
            })}
          </button>
          {open && (
            <div
              role="menu"
              className="absolute z-10 mt-2 grid grid-cols-4 gap-1 p-1.5 w-[188px] rounded-[12px] border border-ml-line-2 bg-ml-raised shadow-ml-pop"
            >
              {Object.keys(ICON_COMPONENTS).map((iconName) => (
                <button
                  key={iconName}
                  type="button"
                  role="menuitem"
                  aria-label={iconName}
                  title={iconName}
                  className={`w-10 h-10 grid place-items-center rounded-[9px] border cursor-pointer transition-colors duration-150 hover:bg-ml-raised-2 hover:border-ml-line ${
                    iconName === row.icon
                      ? "border-ml-accent-line bg-ml-accent-soft"
                      : "border-transparent"
                  }`}
                  onClick={() => {
                    onChange({ ...row, icon: iconName });
                    setOpen(false);
                  }}
                >
                  {React.createElement(ICON_COMPONENTS[iconName], {
                    className: "h-5 w-5",
                    weight: "fill",
                    color: "var(--theme-sidebar-footer-icon-fill)",
                  })}
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          type="text"
          inputMode="url"
          autoComplete="off"
          value={row.url}
          onChange={(e) => onChange({ ...row, url: e.target.value })}
          placeholder="https://example.com"
          aria-label={t("customization.branding.advanced.footer.link-n", {
            n: index + 1,
          })}
          aria-invalid={!!errorCode && errorCode !== "missing_icon"}
          className={`${SET_INPUT} ${SET_FIELD_INVALID} flex-1 min-w-0`}
        />
        <button
          type="button"
          onClick={() => onChange({ icon: EMPTY_ICON, url: "" })}
          disabled={empty}
          aria-label={t("customization.branding.advanced.footer.clear-n", {
            n: index + 1,
          })}
          title={t("customization.branding.advanced.footer.clear-n", {
            n: index + 1,
          })}
          className="w-field h-field shrink-0 grid place-items-center rounded-[12px] border border-ml-line-2 bg-ml-raised text-ml-text-2 cursor-pointer transition-colors duration-150 hover:border-ml-bad hover:text-ml-bad disabled:opacity-40 disabled:cursor-default disabled:hover:border-ml-line-2 disabled:hover:text-ml-text-2"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      {error && <SettingsFieldError>{error}</SettingsFieldError>}
    </div>
  );
}
