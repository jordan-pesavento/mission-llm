import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FullScreenLoader } from "@/components/Preloader";
import Invite from "@/models/invite";
import NewUserModal from "./NewUserModal";
import AuthLayout, {
  AuthAlert,
  AuthHeading,
} from "@/components/Modals/Password/AuthLayout";

export default function InvitePage() {
  const { t } = useTranslation();
  const { code } = useParams();
  const [result, setResult] = useState({
    status: "loading",
    message: null,
  });

  useEffect(() => {
    async function checkInvite() {
      if (!code) {
        setResult({
          status: "invalid",
          message: "No invite code provided.",
        });
        return;
      }
      const { invite, error } = await Invite.checkInvite(code);
      setResult({
        status: invite ? "valid" : "invalid",
        message: error,
      });
    }
    checkInvite();
  }, []);

  if (result.status === "loading") {
    return (
      <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
        <FullScreenLoader />
      </div>
    );
  }

  if (result.status === "invalid") {
    return (
      <AuthLayout>
        <div className="flex w-full flex-col gap-[18px]">
          <AuthHeading
            id="invite-invalid-title"
            title={t("invite.invalid-title", {
              defaultValue: "Invitation unavailable",
            })}
          />
          <AuthAlert id="invite-invalid">{result.message}</AuthAlert>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <NewUserModal />
    </AuthLayout>
  );
}
