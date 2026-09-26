import React, { useEffect, useState } from "react";
import System from "../../../models/system";
import { AUTH_TOKEN } from "../../../utils/constants";
import paths from "../../../utils/paths";
import Modal from "@/components/lib/Modal";
import { useModal } from "@/hooks/useModal";
import RecoveryCodeModal from "@/components/Modals/DisplayRecoveryCodeModal";
import { useTranslation } from "react-i18next";
import PasswordInput from "@/components/lib/PasswordInput";
import {
  AUTH_FIELD,
  AuthAlert,
  AuthButton,
  AuthField,
  AuthForm,
  AuthHeading,
} from "./AuthLayout";

export default function SingleUserAuth() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [token, setToken] = useState(null);
  const [customAppName, setCustomAppName] = useState(null);

  const {
    isOpen: isRecoveryCodeModalOpen,
    openModal: openRecoveryCodeModal,
    closeModal: closeRecoveryCodeModal,
  } = useModal();

  const handleLogin = async (e) => {
    setError(null);
    setLoading(true);
    e.preventDefault();
    const data = {};
    const form = new FormData(e.target);
    for (var [key, value] of form.entries()) data[key] = value;
    const { valid, token, message, recoveryCodes } =
      await System.requestToken(data);
    if (valid && !!token) {
      setToken(token);
      if (recoveryCodes) {
        setRecoveryCodes(recoveryCodes);
        openRecoveryCodeModal();
      } else {
        window.localStorage.setItem(AUTH_TOKEN, token);
        window.location = paths.home();
      }
    } else {
      setError(message);
      setLoading(false);
    }
    setLoading(false);
  };

  const handleDownloadComplete = () => {
    setDownloadComplete(true);
  };

  useEffect(() => {
    if (downloadComplete && token) {
      window.localStorage.setItem(AUTH_TOKEN, token);
      window.location = paths.home();
    }
  }, [downloadComplete, token]);

  useEffect(() => {
    const fetchCustomAppName = async () => {
      const { appName } = await System.fetchCustomAppName();
      setCustomAppName(appName || "");
      setLoading(false);
    };
    fetchCustomAppName();
  }, []);

  return (
    <>
      <AuthForm onSubmit={handleLogin}>
        <AuthHeading
          title={t("login.title", { defaultValue: "Sign in" })}
          subtitle={t("login.single-user.subtitle", {
            defaultValue: "Enter the password for this {{appName}} instance.",
            appName: customAppName || "Mission LLM",
          })}
        />
        <AuthField
          id="signin-password"
          label={t("login.multi-user.placeholder-password")}
        >
          <PasswordInput
            id="signin-password"
            name="password"
            placeholder={t("login.multi-user.placeholder-password")}
            className={AUTH_FIELD}
            required={true}
            autoComplete="off"
          />
        </AuthField>
        {error && <AuthAlert id="signin-error">{error}</AuthAlert>}
        <AuthButton disabled={loading} busy={loading} type="submit">
          {loading
            ? t("login.multi-user.validating")
            : t("login.title", { defaultValue: "Sign in" })}
        </AuthButton>
      </AuthForm>

      <Modal
        isOpen={isRecoveryCodeModalOpen}
        noPortal={true}
        onClose={closeRecoveryCodeModal}
      >
        <RecoveryCodeModal
          recoveryCodes={recoveryCodes}
          onDownloadComplete={handleDownloadComplete}
          onClose={closeRecoveryCodeModal}
        />
      </Modal>
    </>
  );
}
