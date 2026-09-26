import React, { useEffect, useState } from "react";
import { FullScreenLoader } from "@/components/Preloader";
import paths from "@/utils/paths";
import useQuery from "@/hooks/useQuery";
import System from "@/models/system";
import { AUTH_TIMESTAMP, AUTH_TOKEN, AUTH_USER } from "@/utils/constants";
import { useTranslation } from "react-i18next";
import AuthLayout, {
  AuthAlert,
  AuthHeading,
} from "@/components/Modals/Password/AuthLayout";

export default function SimpleSSOPassthrough() {
  const { t } = useTranslation();
  const query = useQuery();
  const redirectPath = query.get("redirectTo") || paths.home();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      if (!query.get("token")) throw new Error("No token provided.");

      // Clear any existing auth data
      window.localStorage.removeItem(AUTH_USER);
      window.localStorage.removeItem(AUTH_TOKEN);
      window.localStorage.removeItem(AUTH_TIMESTAMP);

      System.simpleSSOLogin(query.get("token"))
        .then((res) => {
          if (!res.valid) throw new Error(res.message);

          window.localStorage.setItem(AUTH_USER, JSON.stringify(res.user));
          window.localStorage.setItem(AUTH_TOKEN, res.token);
          window.localStorage.setItem(AUTH_TIMESTAMP, Number(new Date()));
          setReady(res.valid);
        })
        .catch((e) => {
          setError(e.message);
        });
    } catch (e) {
      setError(e.message);
    }
  }, []);

  if (error)
    return (
      <AuthLayout>
        <div className="flex w-full flex-col gap-[18px]">
          <AuthHeading
            id="sso-error-title"
            title={t("login.title", { defaultValue: "Sign in" })}
          />
          <AuthAlert id="sso-error">{error}</AuthAlert>
          <p className="text-[15px] leading-[1.6] text-ml-text-2">
            Please contact the system administrator about this error.
          </p>
        </div>
      </AuthLayout>
    );
  if (ready) return window.location.replace(redirectPath);

  // Loading state by default
  return <FullScreenLoader />;
}
