import { useEffect, useState } from "react";
import Admin from "@/models/admin";
import showToast from "@/utils/toast";
import { useTranslation } from "react-i18next";
import {
  SettingsRow,
  SettingsField,
  SET_FIELD,
  SET_BTN_PRIMARY,
} from "@/components/SettingsPage";

export default function CustomSiteSettings() {
  const { t } = useTranslation();
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState({
    title: null,
    faviconUrl: null,
  });

  useEffect(() => {
    Admin.systemPreferencesByFields([
      "meta_page_title",
      "meta_page_favicon",
    ]).then(({ settings }) => {
      setSettings({
        title: settings?.meta_page_title,
        faviconUrl: settings?.meta_page_favicon,
      });
    });
  }, []);

  async function handleSiteSettingUpdate(e) {
    e.preventDefault();
    await Admin.updateSystemPreferences({
      meta_page_title: settings.title ?? null,
      meta_page_favicon: settings.faviconUrl ?? null,
    });
    showToast(
      "Site preferences updated! They will reflect on page reload.",
      "success",
      { clear: true }
    );
    setHasChanges(false);
    return;
  }

  return (
    <SettingsRow
      as="form"
      onChange={() => setHasChanges(true)}
      onSubmit={handleSiteSettingUpdate}
      title={t("customization.items.browser-appearance.title")}
      description={t("customization.items.browser-appearance.description")}
    >
      <SettingsField
        label={t("customization.items.browser-appearance.tab.title")}
      >
        <input
          name="meta_page_title"
          type="text"
          className={SET_FIELD}
          placeholder="Mission LLM | Private, self-hosted AI"
          autoComplete="off"
          onChange={(e) => {
            setSettings((prev) => {
              return { ...prev, title: e.target.value };
            });
          }}
          value={settings.title ?? "Mission LLM | Private, self-hosted AI"}
        />
        <span className="text-[14px] font-normal leading-[1.5] text-ml-text-3">
          {t("customization.items.browser-appearance.tab.description")}
        </span>
      </SettingsField>
      <SettingsField
        label={t("customization.items.browser-appearance.favicon.title")}
      >
        <div className="flex items-center gap-2.5">
          <img
            src={settings.faviconUrl ?? "/favicon.png"}
            onError={(e) => (e.target.src = "/favicon.png")}
            className="w-field h-field shrink-0 rounded-[12px] border border-ml-line-2 bg-ml-panel object-contain p-1.5"
            alt="Site favicon"
          />
          <input
            name="meta_page_favicon"
            type="url"
            className={SET_FIELD}
            placeholder="url to your image"
            onChange={(e) => {
              setSettings((prev) => {
                return { ...prev, faviconUrl: e.target.value };
              });
            }}
            autoComplete="off"
            value={settings.faviconUrl ?? ""}
          />
        </div>
        <span className="text-[14px] font-normal leading-[1.5] text-ml-text-3">
          {t("customization.items.browser-appearance.favicon.description")}
        </span>
      </SettingsField>
      {hasChanges && (
        <div className="flex items-center gap-2.5">
          <button type="submit" className={SET_BTN_PRIMARY}>
            Save
          </button>
        </div>
      )}
    </SettingsRow>
  );
}
