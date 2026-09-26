import { useTranslation } from "react-i18next";
import {
  SettingsRow,
  SettingsField,
  SettingsToggle,
  SET_INPUT,
  SET_FIELD_INVALID,
} from "@/components/SettingsPage";
import { MAX_LENGTH } from "./form";
import { errorMessage } from "./parts";

export default function SignInTab({ form, setField, errors }) {
  const { t } = useTranslation();
  const fieldError = (key) =>
    errors[key] ? errorMessage(t, errors[key], key) : null;

  return (
    <>
      <SettingsRow
        title={t("customization.branding.sign-in.notice.title")}
        description={t("customization.branding.sign-in.notice.description")}
      >
        <SettingsToggle
          id="branding-notice-enabled"
          checked={form.brand_login_notice_enabled}
          onChange={(on) => {
            setField("brand_login_notice_enabled", on);
            if (!on) setField("brand_login_require_ack", false);
          }}
          label={t("customization.branding.sign-in.notice.toggle")}
        />
        <SettingsField
          label={t("customization.branding.sign-in.notice.heading")}
          error={fieldError("brand_login_notice_heading")}
        >
          <input
            type="text"
            autoComplete="off"
            maxLength={MAX_LENGTH.brand_login_notice_heading}
            value={form.brand_login_notice_heading}
            aria-invalid={!!errors.brand_login_notice_heading}
            onChange={(e) =>
              setField("brand_login_notice_heading", e.target.value)
            }
            className={`${SET_INPUT} ${SET_FIELD_INVALID}`}
          />
        </SettingsField>
        <SettingsField
          label={t("customization.branding.sign-in.notice.text")}
          error={fieldError("brand_login_notice_text")}
        >
          <textarea
            rows={5}
            maxLength={MAX_LENGTH.brand_login_notice_text}
            value={form.brand_login_notice_text}
            aria-invalid={!!errors.brand_login_notice_text}
            onChange={(e) =>
              setField("brand_login_notice_text", e.target.value)
            }
            className={`${SET_INPUT} ${SET_FIELD_INVALID} !h-auto py-2.5 leading-[1.55] resize-y min-h-[120px]`}
          />
        </SettingsField>
      </SettingsRow>

      <SettingsRow
        title={t("customization.branding.sign-in.ack.title")}
        description={t("customization.branding.sign-in.ack.description")}
      >
        <SettingsToggle
          id="branding-require-ack"
          checked={form.brand_login_require_ack}
          disabled={!form.brand_login_notice_enabled}
          describedBy={
            form.brand_login_notice_enabled
              ? undefined
              : "branding-require-ack-reason"
          }
          onChange={(on) => setField("brand_login_require_ack", on)}
          label={t("customization.branding.sign-in.ack.toggle")}
        />
        {!form.brand_login_notice_enabled && (
          <p
            id="branding-require-ack-reason"
            className="text-[14.5px] leading-[1.5] text-ml-text-3"
          >
            {t("customization.branding.sign-in.ack.needs-notice")}
          </p>
        )}
      </SettingsRow>
    </>
  );
}
