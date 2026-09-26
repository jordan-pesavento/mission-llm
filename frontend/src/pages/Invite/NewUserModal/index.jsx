import React, { useState } from "react";
import Invite from "@/models/invite";
import paths from "@/utils/paths";
import { useParams } from "react-router-dom";
import { AUTH_TOKEN, AUTH_USER } from "@/utils/constants";
import System from "@/models/system";
import { useTranslation } from "react-i18next";
import {
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_PATTERN,
} from "@/utils/username";
import PasswordInput from "@/components/lib/PasswordInput";
import {
  AUTH_FIELD,
  AuthAlert,
  AuthButton,
  AuthField,
  AuthForm,
  AuthHeading,
  AuthInput,
} from "@/components/Modals/Password/AuthLayout";

/**
 * Invite acceptance form. Rendered in the sign-in frame (brand panel plus
 * form column) instead of a modal over an empty page.
 */
export default function NewUserModal() {
  const { code } = useParams();
  const [error, setError] = useState(null);
  const { t } = useTranslation();

  const handleCreate = async (e) => {
    setError(null);
    e.preventDefault();
    const data = {};
    const form = new FormData(e.target);
    for (var [key, value] of form.entries()) data[key] = value;
    const { success, error } = await Invite.acceptInvite(code, data);
    if (success) {
      const { valid, user, token, message } = await System.requestToken(data);
      if (valid && !!token && !!user) {
        window.localStorage.setItem(AUTH_USER, JSON.stringify(user));
        window.localStorage.setItem(AUTH_TOKEN, token);
        window.location = paths.home();
      } else {
        setError(message);
      }
      return;
    }
    setError(error);
  };

  return (
    <AuthForm onSubmit={handleCreate}>
      <AuthHeading
        title="Create a new account"
        subtitle="After creating your account you will be able to login with these credentials and start using workspaces."
      />
      <AuthField
        id="invite-username"
        label="Username"
        hint={t("common.username_requirements")}
      >
        <AuthInput
          id="invite-username"
          name="username"
          type="text"
          placeholder="My username"
          minLength={USERNAME_MIN_LENGTH}
          maxLength={USERNAME_MAX_LENGTH}
          pattern={USERNAME_PATTERN}
          required={true}
          autoComplete="off"
        />
      </AuthField>
      <AuthField id="invite-password" label="Password">
        <PasswordInput
          id="invite-password"
          name="password"
          placeholder="Your password"
          className={AUTH_FIELD}
          required={true}
          minLength={8}
          autoComplete="off"
        />
      </AuthField>
      {error && <AuthAlert id="invite-error">{error}</AuthAlert>}
      <AuthButton type="submit">Accept Invitation</AuthButton>
    </AuthForm>
  );
}
