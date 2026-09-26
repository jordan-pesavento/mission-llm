import useUser from "@/hooks/useUser";
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

export default function SupportEmail() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [supportEmail, setSupportEmail] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    const fetchSupportEmail = async () => {
      const supportEmail = await System.fetchSupportEmail();
      setSupportEmail(supportEmail.email || "");
      setOriginalEmail(supportEmail.email || "");
      setLoading(false);
    };
    fetchSupportEmail();
  }, []);

  const updateSupportEmail = async (e, newValue = null) => {
    e.preventDefault();
    let support_email = newValue;
    if (newValue === null) {
      const form = new FormData(e.target);
      support_email = form.get("supportEmail");
    }

    const { success, error } = await Admin.updateSystemPreferences({
      support_email,
    });

    if (!success) {
      showToast(`Failed to update support email: ${error}`, "error");
      return;
    } else {
      showToast("Successfully updated support email.", "success");
      window.localStorage.removeItem(System.cacheKeys.supportEmail);
      setSupportEmail(support_email);
      setOriginalEmail(support_email);
      setHasChanges(false);
    }
  };

  const handleChange = (e) => {
    setSupportEmail(e.target.value);
    setHasChanges(true);
  };

  if (loading || !user?.role) return null;
  return (
    <SettingsRow
      as="form"
      onSubmit={updateSupportEmail}
      title={t("customization.items.support-email.title")}
      description={t("customization.items.support-email.description")}
    >
      <input
        name="supportEmail"
        type="email"
        aria-label={t("customization.items.support-email.title")}
        className={SET_FIELD}
        placeholder="support@mycompany.com"
        required={true}
        autoComplete="off"
        onChange={handleChange}
        value={supportEmail}
      />
      {(hasChanges || originalEmail !== "") && (
        <div
          data-row="support-email-actions"
          className="flex items-center gap-2.5"
        >
          {hasChanges && (
            <button type="submit" className={SET_BTN_PRIMARY}>
              Save
            </button>
          )}
          {originalEmail !== "" && (
            <button
              type="button"
              onClick={(e) => updateSupportEmail(e, "")}
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
