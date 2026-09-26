import Admin from "@/models/admin";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  SettingsRow,
  SET_FIELD,
  SET_BTN,
  SET_BTN_PRIMARY,
} from "@/components/SettingsPage";

export default function CustomAppName() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [customAppName, setCustomAppName] = useState("");
  const [originalAppName, setOriginalAppName] = useState("");
  const [canCustomize, setCanCustomize] = useState(false);

  useEffect(() => {
    const fetchInitialParams = async () => {
      const settings = await System.keys();
      if (!settings?.MultiUserMode && !settings?.RequiresAuth) {
        setCanCustomize(false);
        return false;
      }

      const { appName } = await System.fetchCustomAppName();
      setCustomAppName(appName || "");
      setOriginalAppName(appName || "");
      setCanCustomize(true);
      setLoading(false);
    };
    fetchInitialParams();
  }, []);

  const updateCustomAppName = async (e, newValue = null) => {
    e.preventDefault();
    let custom_app_name = newValue;
    if (newValue === null) {
      const form = new FormData(e.target);
      custom_app_name = form.get("customAppName");
    }
    const { success, error } = await Admin.updateSystemPreferences({
      custom_app_name,
    });
    if (!success) {
      showToast(`Failed to update custom app name: ${error}`, "error");
      return;
    } else {
      showToast("Successfully updated custom app name.", "success");
      window.localStorage.removeItem(System.cacheKeys.customAppName);
      setCustomAppName(custom_app_name);
      setOriginalAppName(custom_app_name);
      setHasChanges(false);
    }
  };

  const handleChange = (e) => {
    setCustomAppName(e.target.value);
    setHasChanges(true);
  };

  if (!canCustomize || loading) return null;

  return (
    <SettingsRow
      as="form"
      onSubmit={updateCustomAppName}
      title={t("customization.items.app-name.title")}
      description={t("customization.items.app-name.description")}
    >
      <input
        name="customAppName"
        type="text"
        aria-label={t("customization.items.app-name.title")}
        className={SET_FIELD}
        placeholder="Mission LLM"
        required={true}
        autoComplete="off"
        onChange={handleChange}
        value={customAppName}
      />
      {(hasChanges || originalAppName !== "") && (
        <div data-row="app-name-actions" className="flex items-center gap-2.5">
          {hasChanges && (
            <button type="submit" className={SET_BTN_PRIMARY}>
              Save
            </button>
          )}
          {originalAppName !== "" && (
            <button
              type="button"
              onClick={(e) => updateCustomAppName(e, "")}
              className={SET_BTN}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </SettingsRow>
  );
}
