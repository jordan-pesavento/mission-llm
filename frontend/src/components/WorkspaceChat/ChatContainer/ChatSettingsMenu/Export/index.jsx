import { useState } from "react";
import { CaretRight } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { saveAs } from "file-saver";
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
import moment from "moment";
import { MENU_ROW, MENU_SURFACE } from "../../chatUi";

const EXPORT_FORMATS = [
  { key: "pdf", label: "PDF", ext: "pdf" },
  { key: "markdown", label: "Markdown", ext: "md" },
  { key: "plaintext", label: "Plain Text", ext: "txt" },
  { key: "json", label: "JSON", ext: "json" },
  { key: "html", label: "HTML", ext: "html" },
];

export default function ExportRow({
  history = [],
  workspace = null,
  threadSlug = null,
  onClose,
}) {
  const { t } = useTranslation();
  const [showSubmenu, setShowSubmenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleExport(format) {
    if (exporting || !workspace?.slug) return;
    setExporting(true);
    const blob = await Workspace.exportChatsToType(
      workspace.slug,
      threadSlug,
      format.key
    );
    if (blob) {
      const stamp = moment().format("YYYY-MM-DD HH:mm:ss");
      saveAs(blob, `Mission LLM Export - ${stamp}.${format.ext}`);
    } else {
      showToast("Failed to export chat.", "error");
    }
    setExporting(false);
    onClose();
  }

  if (history.length === 0) return null;
  return (
    <div
      className="relative"
      onMouseEnter={() => setShowSubmenu(true)}
      onMouseLeave={() => setShowSubmenu(false)}
    >
      <button
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={showSubmenu}
        onClick={() => setShowSubmenu((v) => !v)}
        className={`${MENU_ROW} justify-between ${showSubmenu ? "bg-ml-raised-2 text-ml-text" : ""}`}
      >
        <span>
          {exporting ? t("chat_window.exporting") : t("chat_window.export")}
        </span>
        <CaretRight size={14} weight="bold" className="text-ml-text-3" />
      </button>
      {showSubmenu && (
        <ExportSubmenu onSelect={handleExport} exporting={exporting} />
      )}
    </div>
  );
}

function ExportSubmenu({ onSelect, exporting }) {
  return (
    <div className="absolute right-full top-0 pr-2">
      <div
        role="menu"
        className={`w-[150px] p-1.5 flex flex-col gap-0.5 ${MENU_SURFACE}`}
      >
        {EXPORT_FORMATS.map((format) => (
          <button
            type="button"
            role="menuitem"
            key={format.key}
            disabled={exporting}
            onClick={() => !exporting && onSelect(format)}
            className={`${MENU_ROW} ${exporting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {format.label}
          </button>
        ))}
      </div>
    </div>
  );
}
