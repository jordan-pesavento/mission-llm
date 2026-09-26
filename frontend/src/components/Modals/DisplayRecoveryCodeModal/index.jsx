import showToast from "@/utils/toast";
import { Copy, DownloadSimple, Key } from "@phosphor-icons/react";
import { saveAs } from "file-saver";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function RecoveryCodeModal({
  recoveryCodes,
  onDownloadComplete,
  onClose,
}) {
  const { t } = useTranslation();
  const [downloadClicked, setDownloadClicked] = useState(false);

  const downloadRecoveryCodes = () => {
    const blob = new Blob([recoveryCodes.join("\n")], { type: "text/plain" });
    saveAs(blob, "recovery_codes.txt");
    setDownloadClicked(true);
  };

  const handleClose = () => {
    if (downloadClicked) {
      onDownloadComplete();
      onClose();
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(recoveryCodes.join(",\n")).then(() => {
      showToast("Recovery codes copied to clipboard", "success", {
        clear: true,
      });
    });
  };

  return (
    <div className="flex flex-col gap-y-5 text-ml-text">
      <div className="flex items-center gap-x-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-ml-accent-line bg-ml-accent-soft text-ml-accent-text">
          <Key size={20} weight="bold" aria-hidden="true" />
        </span>
        <h2
          id="recovery-codes-title"
          className="font-display text-[22px] font-[650] leading-[1.3] tracking-[0.01em] [font-stretch:112%]"
        >
          Recovery Codes
        </h2>
      </div>
      <div className="flex flex-col gap-y-3 text-[15px] leading-[1.6] text-ml-text-2">
        <p>
          In order to reset your password in the future, you will need these
          recovery codes. Download or copy your recovery codes to save them.
        </p>
        <p className="font-semibold text-ml-text">
          These recovery codes are only shown once!
        </p>
      </div>
      {/* The whole box copies on click, as before; the Copy button inside is
          the keyboard path (its click bubbles to the same handler). */}
      <div
        onClick={handleCopyToClipboard}
        className="group relative w-full cursor-pointer rounded-[12px] border border-ml-line-2 bg-ml-raised px-4 py-3.5 transition-[border-color] duration-150 ease-ml hover:border-ml-accent-line"
      >
        <button
          type="button"
          className="absolute right-2 top-2 inline-flex h-8 items-center gap-x-1.5 rounded-[8px] border-none bg-transparent px-2 text-[13px] font-semibold text-ml-text-3 group-hover:text-ml-accent-text"
        >
          <Copy size={16} weight="bold" aria-hidden="true" />
          {t("chat_window.copy")}
        </button>
        <ul className="flex flex-col gap-y-2 pr-20">
          {recoveryCodes.map((code, index) => (
            <li
              key={index}
              className="font-mono text-[14px] leading-[1.5] text-ml-text break-all"
            >
              {code}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={downloadClicked ? handleClose : downloadRecoveryCodes}
          className="inline-flex h-11 items-center justify-center gap-x-2 rounded-[12px] bg-ml-accent-fill px-5 text-[15px] font-semibold text-ml-on-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_20px_-10px_var(--ml-accent)] transition-[filter] duration-150 ease-ml hover:brightness-105"
        >
          {downloadClicked ? (
            "Close"
          ) : (
            <>
              <DownloadSimple weight="bold" size={18} aria-hidden="true" />
              Download
            </>
          )}
        </button>
      </div>
    </div>
  );
}
