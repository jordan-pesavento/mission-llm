import React, { useEffect, useState } from "react";
import System from "../../../models/system";
import { AUTH_TOKEN, AUTH_USER } from "../../../utils/constants";
import paths from "../../../utils/paths";
import showToast from "@/utils/toast";
import Modal from "@/components/lib/Modal";
import { useModal } from "@/hooks/useModal";
import RecoveryCodeModal from "@/components/Modals/DisplayRecoveryCodeModal";
import { useTranslation } from "react-i18next";
import { t } from "i18next";
import PasswordInput from "@/components/lib/PasswordInput";
import {
  AUTH_FIELD,
  AuthAlert,
  AuthButton,
  AuthField,
  AuthForm,
  AuthHeading,
  AuthInput,
  AuthLink,
} from "./AuthLayout";

const RecoveryForm = ({ onSubmit, setShowRecoveryForm }) => {
  const [username, setUsername] = useState("");
  const [recoveryCodeInputs, setRecoveryCodeInputs] = useState(
    Array(2).fill("")
  );

  const handleRecoveryCodeChange = (index, value) => {
    const updatedCodes = [...recoveryCodeInputs];
    updatedCodes[index] = value;
    setRecoveryCodeInputs(updatedCodes);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const recoveryCodes = recoveryCodeInputs.filter(
      (code) => code.trim() !== ""
    );
    onSubmit(username, recoveryCodes);
  };

  return (
    <AuthForm onSubmit={handleSubmit}>
      <AuthHeading
        title={t("login.password-reset.title")}
        subtitle={t("login.password-reset.description")}
      />
      <AuthField
        id="recover-username"
        label={t("login.multi-user.placeholder-username")}
      >
        <AuthInput
          id="recover-username"
          name="username"
          type="text"
          placeholder={t("login.multi-user.placeholder-username")}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="off"
        />
      </AuthField>
      <AuthField
        id="recover-code-1"
        label={t("login.password-reset.recovery-codes")}
      >
        <div className="flex flex-col gap-y-2.5">
          {recoveryCodeInputs.map((code, index) => (
            <AuthInput
              key={index}
              id={`recover-code-${index + 1}`}
              type="text"
              name={`recoveryCode${index + 1}`}
              aria-label={`${t("login.password-reset.recovery-codes")} ${index + 1}`}
              className="font-mono text-[16px]"
              value={code}
              onChange={(e) => handleRecoveryCodeChange(index, e.target.value)}
              required
              autoComplete="off"
              spellCheck={false}
            />
          ))}
        </div>
      </AuthField>
      <AuthButton type="submit">{t("login.password-reset.title")}</AuthButton>
      <AuthLink onClick={() => setShowRecoveryForm(false)}>
        {t("login.password-reset.back-to-login")}
      </AuthLink>
    </AuthForm>
  );
};

const ResetPasswordForm = ({ onSubmit }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(newPassword, confirmPassword);
  };

  return (
    <AuthForm onSubmit={handleSubmit}>
      <AuthHeading title="Reset Password" subtitle="Enter your new password." />
      <AuthField id="new-password" label="New Password">
        <PasswordInput
          id="new-password"
          name="newPassword"
          className={AUTH_FIELD}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
      </AuthField>
      <AuthField id="confirm-password" label="Confirm Password">
        <PasswordInput
          id="confirm-password"
          name="confirmPassword"
          className={AUTH_FIELD}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </AuthField>
      <AuthButton type="submit">Reset Password</AuthButton>
    </AuthForm>
  );
};

export default function MultiUserAuth() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);
  const [showResetPasswordForm, setShowResetPasswordForm] = useState(false);
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
    const { valid, user, token, message, recoveryCodes } =
      await System.requestToken(data);
    if (valid && !!token && !!user) {
      setUser(user);
      setToken(token);

      if (recoveryCodes) {
        setRecoveryCodes(recoveryCodes);
        openRecoveryCodeModal();
      } else {
        window.localStorage.setItem(AUTH_USER, JSON.stringify(user));
        window.localStorage.setItem(AUTH_TOKEN, token);
        window.location = paths.home();
      }
    } else {
      setError(message);
      setLoading(false);
    }
    setLoading(false);
  };

  const handleDownloadComplete = () => setDownloadComplete(true);
  const handleResetPassword = () => setShowRecoveryForm(true);
  const handleRecoverySubmit = async (username, recoveryCodes) => {
    const { success, resetToken, error } = await System.recoverAccount(
      username,
      recoveryCodes
    );

    if (success && resetToken) {
      window.localStorage.setItem("resetToken", resetToken);
      setShowRecoveryForm(false);
      setShowResetPasswordForm(true);
    } else {
      showToast(error, "error", { clear: true });
    }
  };

  const handleResetSubmit = async (newPassword, confirmPassword) => {
    const resetToken = window.localStorage.getItem("resetToken");

    if (resetToken) {
      const { success, error } = await System.resetPassword(
        resetToken,
        newPassword,
        confirmPassword
      );

      if (success) {
        window.localStorage.removeItem("resetToken");
        setShowResetPasswordForm(false);
        showToast("Password reset successful", "success", { clear: true });
      } else {
        showToast(error, "error", { clear: true });
      }
    } else {
      showToast("Invalid reset token", "error", { clear: true });
    }
  };

  useEffect(() => {
    if (downloadComplete && user && token) {
      window.localStorage.setItem(AUTH_USER, JSON.stringify(user));
      window.localStorage.setItem(AUTH_TOKEN, token);
      window.location = paths.home();
    }
  }, [downloadComplete, user, token]);

  useEffect(() => {
    const fetchCustomAppName = async () => {
      const { appName } = await System.fetchCustomAppName();
      setCustomAppName(appName || "");
      setLoading(false);
    };
    fetchCustomAppName();
  }, []);

  if (showRecoveryForm) {
    return (
      <RecoveryForm
        onSubmit={handleRecoverySubmit}
        setShowRecoveryForm={setShowRecoveryForm}
      />
    );
  }

  if (showResetPasswordForm)
    return <ResetPasswordForm onSubmit={handleResetSubmit} />;
  return (
    <>
      <AuthForm onSubmit={handleLogin}>
        <AuthHeading
          title={t("login.title", { defaultValue: "Sign in" })}
          subtitle={t("login.subtitle", {
            defaultValue: "Use your {{appName}} account.",
            appName: customAppName || "Mission LLM",
          })}
        />
        <AuthField
          id="signin-username"
          label={t("login.multi-user.placeholder-username")}
        >
          <AuthInput
            id="signin-username"
            name="username"
            type="text"
            placeholder={t("login.multi-user.placeholder-username")}
            required={true}
            autoComplete="off"
          />
        </AuthField>
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
        <AuthLink onClick={handleResetPassword}>
          {t("login.multi-user.forgot-pass")}?
        </AuthLink>
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
