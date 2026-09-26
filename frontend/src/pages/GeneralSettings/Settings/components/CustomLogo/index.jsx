import useLogo from "@/hooks/useLogo";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { useEffect, useRef, useState } from "react";
import { Plus, Trash, UploadSimple } from "@phosphor-icons/react";
import { SettingsRow, SET_SBTN } from "@/components/SettingsPage";
import { useTranslation } from "react-i18next";

export default function CustomLogo() {
  const { t } = useTranslation();
  const { logo: _initLogo, setLogo: _setLogo } = useLogo();
  const [logo, setLogo] = useState("");
  const [isDefaultLogo, setIsDefaultLogo] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function logoInit() {
      setLogo(_initLogo || "");
      const _isDefaultLogo = await System.isDefaultLogo();
      setIsDefaultLogo(_isDefaultLogo);
    }
    logoInit();
  }, [_initLogo]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return false;

    const objectURL = URL.createObjectURL(file);
    setLogo(objectURL);

    const formData = new FormData();
    formData.append("logo", file);
    const { success, error } = await System.uploadLogo(formData);
    if (!success) {
      showToast(`Failed to upload logo: ${error}`, "error");
      setLogo(_initLogo);
      return;
    }

    const { logoURL } = await System.fetchLogo();
    _setLogo(logoURL);

    showToast("Image uploaded successfully.", "success");
    setIsDefaultLogo(false);
  };

  const handleRemoveLogo = async () => {
    setLogo("");
    setIsDefaultLogo(true);

    const { success, error } = await System.removeCustomLogo();
    if (!success) {
      console.error("Failed to remove logo:", error);
      showToast(`Failed to remove logo: ${error}`, "error");
      const { logoURL } = await System.fetchLogo();
      setLogo(logoURL);
      setIsDefaultLogo(false);
      return;
    }

    const { logoURL } = await System.fetchLogo();
    _setLogo(logoURL);

    showToast("Image successfully removed.", "success");
  };

  const triggerFileInputClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <SettingsRow
      title={t("customization.items.logo.title")}
      description={t("customization.items.logo.description")}
    >
      <input
        id="logo-upload"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
        ref={fileInputRef}
      />
      <div className="w-full max-w-[520px] rounded-[14px] border border-ml-line-2 bg-ml-panel overflow-hidden">
        <button
          type="button"
          onClick={triggerFileInputClick}
          aria-label={
            isDefaultLogo
              ? t("customization.items.logo.add")
              : t("customization.items.logo.replace")
          }
          className="w-full h-[112px] grid place-items-center px-6 border-b border-ml-line bg-ml-rail cursor-pointer transition-colors duration-150 hover:bg-ml-raised"
        >
          {logo ? (
            <img
              src={logo}
              alt={isDefaultLogo ? "Default logo" : "Uploaded Logo"}
              className="max-h-[52px] max-w-full object-contain"
            />
          ) : (
            <Plus className="w-6 h-6 text-ml-text-2" />
          )}
        </button>
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <span className="min-w-0 text-[14px] leading-[1.4] text-ml-text-3">
            {t("customization.items.logo.recommended")}
          </span>
          <div
            data-row="logo-actions"
            className="flex items-center gap-1.5 shrink-0"
          >
            <button
              type="button"
              onClick={triggerFileInputClick}
              className={SET_SBTN}
            >
              <UploadSimple size={16} />
              {isDefaultLogo
                ? t("customization.items.logo.add")
                : t("customization.items.logo.replace")}
            </button>
            {!isDefaultLogo && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                className={SET_SBTN}
              >
                <Trash size={16} />
                {t("customization.items.logo.remove")}
              </button>
            )}
          </div>
        </div>
      </div>
    </SettingsRow>
  );
}
