import Sidebar from "@/components/SettingsSidebar";
import FooterCustomization from "../components/FooterCustomization";
import SupportEmail from "../components/SupportEmail";
import CustomLogo from "../components/CustomLogo";
import { useTranslation } from "react-i18next";
import CustomAppName from "../components/CustomAppName";
import CustomSiteSettings from "../components/CustomSiteSettings";
import { SettingsPageHead } from "@/components/SettingsPage";

export default function BrandingSettings() {
  const { t } = useTranslation();

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      <div
        style={{ height: "100%" }}
        className="relative bg-ml-ground w-full h-full min-w-0 overflow-y-auto"
      >
        <div className="flex flex-col w-full px-set-gutter pb-10">
          <SettingsPageHead
            title={t("customization.branding.title")}
            description={t("customization.branding.description")}
          />
          <div className="w-full max-w-[1100px]">
            <CustomAppName />
            <CustomLogo />
            <FooterCustomization />
            <SupportEmail />
            <CustomSiteSettings />
          </div>
        </div>
      </div>
    </div>
  );
}
