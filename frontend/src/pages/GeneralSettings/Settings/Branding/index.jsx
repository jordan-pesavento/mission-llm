import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Tooltip } from "react-tooltip";
import {
  ArrowCounterClockwise,
  Check,
  CircleNotch,
  Code,
  FlagBanner,
  IdentificationBadge,
  Palette,
  SignIn,
} from "@phosphor-icons/react";
import Sidebar from "@/components/SettingsSidebar";
import {
  SettingsPageHead,
  SettingsTabs,
  SET_BTN,
  SET_BTN_PRIMARY,
} from "@/components/SettingsPage";
import useBranding from "@/hooks/useBranding";
import useUser from "@/hooks/useUser";
import BrandingAdmin from "@/models/brandingAdmin";
import { derivePageTitle, normalizeBrand } from "@/models/branding";
import { computeAccent } from "@/utils/branding/accent";
import showToast from "@/utils/toast";
import {
  FIELD_TAB,
  TABS,
  changedFields,
  firstTabWithError,
  fromValues,
  mergeDefaults,
  normalizeHex,
  toValues,
  validate,
} from "./components/form";
import {
  ICON_VARIANT_SIZES,
  inspectUpload,
  makeIconVariants,
  oversizedVariant,
} from "./components/images";
import { errorMessage, useDocumentTheme } from "./components/parts";
import IdentityTab from "./components/IdentityTab";
import ColorsTab from "./components/ColorsTab";
import SignInTab from "./components/SignInTab";
import BannerTab from "./components/BannerTab";
import AdvancedTab from "./components/AdvancedTab";
import LivePreview from "./components/LivePreview";
import { ResetModal, UnsavedChangesGuard } from "./components/Dialogs";

const TAB_ICONS = {
  identity: IdentificationBadge,
  colors: Palette,
  "sign-in": SignIn,
  banner: FlagBanner,
  advanced: Code,
};

export default function BrandingSettings() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { setPreview } = useBranding();
  const theme = useDocumentTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const scrollRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [defaults, setDefaults] = useState(() => mergeDefaults());
  const [limits, setLimits] = useState({});
  const [brand, setBrand] = useState(null);
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [footerRowErrors, setFooterRowErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState({});
  const [assetErrors, setAssetErrors] = useState({});
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const isAdmin = !(user?.hasOwnProperty("role") && user.role !== "admin");
  const requested = searchParams.get("tab");
  const tab = TABS.includes(requested) ? requested : "identity";

  const load = useCallback(async () => {
    setLoading(true);
    const res = await BrandingAdmin.get();
    if (res.error) {
      setLoadError(res.error);
      setLoading(false);
      return;
    }
    const nextDefaults = mergeDefaults(res.defaults);
    setDefaults(nextDefaults);
    setLimits(res.limits || {});
    setBrand(res.brand ? normalizeBrand(res.brand) : null);
    setSaved(res.values);
    setForm(fromValues(res.values, nextDefaults));
    setErrors({});
    setFooterRowErrors([]);
    setLoadError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const savedForm = useMemo(
    () => (saved ? fromValues(saved, defaults) : null),
    [saved, defaults]
  );
  const changed = useMemo(
    () => changedFields(form, savedForm, defaults),
    [form, savedForm, defaults]
  );
  const dirty = changed.length > 0;

  // Effective accent for the draft. A hex that does not parse yet keeps the
  // saved color, so typing never flashes a broken preview.
  const accent = useMemo(() => {
    if (!form) return computeAccent({});
    const draft = toValues(form, defaults);
    const savedValues = savedForm ? toValues(savedForm, defaults) : {};
    const base = normalizeHex(form.brand_accent)
      ? draft.brand_accent || null
      : savedValues.brand_accent || null;
    let light = null;
    if (form.brand_accent_light_mode === "custom")
      light =
        normalizeHex(form.brand_accent_light) ||
        normalizeHex(savedValues.brand_accent_light) ||
        null;
    return computeAccent({ base, light });
  }, [form, savedForm, defaults]);

  // Apply the unsaved draft app-wide; clear it when saved or on leaving.
  useEffect(() => {
    if (!form || !dirty) {
      setPreview(null);
      return;
    }
    const draft = toValues(form, defaults);
    setPreview({
      appName: form.custom_app_name,
      tagline: form.brand_tagline,
      pageTitle: draft.meta_page_title || null,
      defaultTheme: form.brand_default_theme,
      accent: { base: accent.base, light: accent.light },
      banner: {
        enabled: form.brand_banner_enabled,
        text: form.brand_banner_text,
        bg: normalizeHex(form.brand_banner_bg) || defaults.brand_banner_bg,
        position: form.brand_banner_position,
      },
      login: {
        notice: {
          enabled: form.brand_login_notice_enabled,
          heading: form.brand_login_notice_heading,
          text: form.brand_login_notice_text,
        },
        requireAck: form.brand_login_require_ack,
      },
    });
  }, [form, dirty, accent, defaults]);

  useEffect(() => () => setPreview(null), [setPreview]);

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    const label =
      key === "brand_accent_light_mode" ? "brand_accent_light" : key;
    setErrors((prev) => {
      if (!prev[label]) return prev;
      const next = { ...prev };
      delete next[label];
      return next;
    });
    if (key === "footer_data") setFooterRowErrors([]);
  }, []);

  function selectTab(id) {
    if (id === tab) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", id);
        return next;
      },
      { replace: true }
    );
    scrollRef.current?.scrollTo({ top: 0 });
  }

  function showErrors(nextErrors, rows = []) {
    setErrors(nextErrors);
    setFooterRowErrors(rows);
    const first = firstTabWithError(nextErrors);
    if (first) selectTab(first);
    showToast(t("customization.branding.toast.fix-fields"), "error", {
      clear: true,
    });
  }

  async function handleSave() {
    if (!dirty || saving) return;
    const check = validate(form);
    if (Object.keys(check.errors).length) {
      showErrors(check.errors, check.footerRows);
      return;
    }
    const all = toValues(form, defaults);
    const payload = Object.fromEntries(changed.map((key) => [key, all[key]]));
    setSaving(true);
    const res = await BrandingAdmin.save(payload);
    setSaving(false);
    if (!res.success) {
      if (res.errors && Object.keys(res.errors).length) {
        showErrors(res.errors);
        return;
      }
      showToast(
        t("customization.branding.toast.save-failed", {
          error: res.error || "unknown",
        }),
        "error",
        { clear: true }
      );
      return;
    }
    const nextSaved = { ...saved, ...payload, ...(res.values || {}) };
    setSaved(nextSaved);
    setForm(fromValues(nextSaved, defaults));
    if (res.brand) setBrand(normalizeBrand(res.brand));
    setErrors({});
    setFooterRowErrors([]);
    showToast(t("customization.branding.toast.saved"), "success", {
      clear: true,
    });
  }

  async function handleUpload(slot, file) {
    const errorKey = slot === "icon" ? "icon" : "logo";
    setAssetErrors((prev) => ({ ...prev, [errorKey]: null }));
    const info = await inspectUpload(file, slot, limits);
    if (info.error) {
      setAssetErrors((prev) => ({
        ...prev,
        [errorKey]: errorMessage(t, info.error, errorKey),
      }));
      return;
    }

    setBusy((prev) => ({ ...prev, [slot]: true }));
    let res;
    try {
      const formData = new FormData();
      formData.append("file", file, file.name);
      let oversized = null;
      if (slot === "icon") {
        const variants = await makeIconVariants(file, info);
        oversized = oversizedVariant(variants, limits);
        for (const size of ICON_VARIANT_SIZES)
          formData.append(`icon-${size}`, variants[size], `icon-${size}.png`);
      }
      res = oversized
        ? { success: false, error: "variant_too_large" }
        : await BrandingAdmin.uploadAsset(slot, formData);
      // The server names the generated size that went over its limit.
      if (res.error === "too_large" && /^icon-\d+$/.test(res.detail || ""))
        res = { ...res, error: "variant_too_large" };
    } catch (e) {
      console.error(e);
      res = { success: false, error: "upload_failed" };
    }
    setBusy((prev) => ({ ...prev, [slot]: false }));

    if (!res.success) {
      setAssetErrors((prev) => ({
        ...prev,
        [errorKey]: errorMessage(t, res.error, errorKey),
      }));
      return;
    }
    if (res.brand) setBrand(normalizeBrand(res.brand));
    showToast(
      slot === "icon"
        ? t("customization.branding.toast.icon-updated")
        : t("customization.branding.toast.logo-updated"),
      "success",
      { clear: true }
    );
  }

  async function handleRemove(slot) {
    const errorKey = slot === "icon" ? "icon" : "logo";
    setAssetErrors((prev) => ({ ...prev, [errorKey]: null }));
    setBusy((prev) => ({ ...prev, [slot]: true }));
    const res = await BrandingAdmin.removeAsset(slot);
    setBusy((prev) => ({ ...prev, [slot]: false }));
    if (!res.success) {
      showToast(
        t("customization.branding.toast.remove-failed", {
          error: res.error || "unknown",
        }),
        "error",
        { clear: true }
      );
      return;
    }
    if (res.brand) setBrand(normalizeBrand(res.brand));
    showToast(
      slot === "icon"
        ? t("customization.branding.toast.icon-removed")
        : t("customization.branding.toast.logo-removed"),
      "success",
      { clear: true }
    );
  }

  async function handleReset({ includeLinks }) {
    setResetting(true);
    const res = await BrandingAdmin.reset({ includeLinks });
    if (!res.success) {
      setResetting(false);
      showToast(
        t("customization.branding.toast.reset-failed", {
          error: res.error || "unknown",
        }),
        "error",
        { clear: true }
      );
      return;
    }
    await load();
    setAssetErrors({});
    setResetting(false);
    setResetOpen(false);
    showToast(t("customization.branding.toast.reset"), "success", {
      clear: true,
    });
  }

  const tabs = TABS.map((id) => ({
    id,
    label: t(`customization.branding.tabs.${id}`),
    icon: TAB_ICONS[id],
    alert: Object.keys(errors).some((key) => FIELD_TAB[key] === id),
  }));

  const draftValues = form ? toValues(form, defaults) : null;
  const defaultTitle = draftValues
    ? derivePageTitle({
        customAppName: draftValues.custom_app_name || null,
        customTagline: draftValues.brand_tagline || null,
        appName: form.custom_app_name,
        tagline: form.brand_tagline,
      })
    : "";

  const anyBusy = saving || resetting || Object.values(busy).some(Boolean);

  const actions = (
    <div data-row="branding-actions" className="flex items-center gap-2.5">
      <span
        className="inline-flex"
        data-tooltip-id={isAdmin ? undefined : "branding-reset-reason"}
        data-tooltip-content={
          isAdmin ? undefined : t("customization.branding.actions.admin-only")
        }
      >
        <button
          type="button"
          className={SET_BTN}
          disabled={!isAdmin || loading || !!loadError || anyBusy}
          aria-describedby={isAdmin ? undefined : "branding-reset-reason-text"}
          onClick={() => setResetOpen(true)}
        >
          <ArrowCounterClockwise size={18} aria-hidden="true" />
          {t("customization.branding.actions.reset")}
        </button>
      </span>
      {!isAdmin && (
        <span id="branding-reset-reason-text" className="sr-only">
          {t("customization.branding.actions.admin-only")}
        </span>
      )}
      <button
        type="button"
        className={SET_BTN_PRIMARY}
        disabled={!dirty || anyBusy}
        onClick={handleSave}
      >
        {saving ? (
          <CircleNotch size={18} className="animate-spin" aria-hidden="true" />
        ) : (
          <Check size={18} aria-hidden="true" />
        )}
        {saving
          ? t("customization.branding.actions.saving")
          : t("customization.branding.actions.save")}
      </button>
    </div>
  );

  const tabProps = { form, setField, errors };

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      <div className="relative bg-ml-ground w-full h-full min-w-0 flex flex-col">
        <div className="shrink-0 px-set-gutter">
          <SettingsPageHead
            divider={false}
            title={t("customization.branding.title")}
            description={t("customization.branding.description")}
            actions={actions}
          />
          <SettingsTabs
            idPrefix="branding"
            label={t("customization.branding.title")}
            tabs={tabs}
            active={tab}
            onChange={selectTab}
          />
        </div>

        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto px-set-gutter"
        >
          {loading && !form ? (
            <div
              role="status"
              className="flex items-center gap-2.5 py-10 text-[15.5px] text-ml-text-2"
            >
              <CircleNotch
                size={18}
                className="animate-spin"
                aria-hidden="true"
              />
              {t("customization.branding.loading")}
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-start gap-3 py-10">
              <p className="text-[15.5px] text-ml-text-2">
                {t("customization.branding.load-failed")}
              </p>
              <button type="button" className={SET_BTN} onClick={load}>
                {t("customization.branding.retry")}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 min-[1180px]:grid-cols-[minmax(0,1fr)_clamp(320px,29vw,440px)] gap-x-8 items-start pt-2 pb-10">
              <div
                id="branding-panel"
                role="tabpanel"
                aria-labelledby={`branding-tab-${tab}`}
                className="min-w-0"
              >
                {tab === "identity" && (
                  <IdentityTab
                    {...tabProps}
                    brand={brand}
                    accent={accent}
                    busy={busy}
                    assetErrors={assetErrors}
                    onUpload={handleUpload}
                    onRemove={handleRemove}
                  />
                )}
                {tab === "colors" && (
                  <ColorsTab {...tabProps} accent={accent} />
                )}
                {tab === "sign-in" && <SignInTab {...tabProps} />}
                {tab === "banner" && (
                  <BannerTab {...tabProps} defaults={defaults} />
                )}
                {tab === "advanced" && (
                  <AdvancedTab
                    {...tabProps}
                    footerRowErrors={footerRowErrors}
                    defaultTitle={defaultTitle}
                  />
                )}
              </div>
              <div className="min-w-0 mt-6 min-[1180px]:sticky min-[1180px]:top-6">
                <LivePreview
                  draft={form}
                  accent={accent}
                  theme={theme}
                  brand={brand}
                  mode={tab === "sign-in" ? "sign-in" : "app"}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <ResetModal
        isOpen={resetOpen}
        busy={resetting}
        onCancel={() => setResetOpen(false)}
        onConfirm={handleReset}
      />
      <UnsavedChangesGuard when={dirty && !saving} />
      {!isAdmin && (
        <Tooltip
          id="branding-reset-reason"
          place="bottom"
          delayShow={200}
          className="tooltip !opacity-100"
        />
      )}
    </div>
  );
}
