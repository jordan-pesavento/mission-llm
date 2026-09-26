import { useState } from "react";
import { CaretRight, Check } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { MENU_ROW, MENU_SURFACE } from "../../chatUi";

function getTextSizes(t) {
  return [
    { key: "small", label: t("chat_window.small") },
    { key: "normal", label: t("chat_window.normal") },
    { key: "large", label: t("chat_window.large") },
  ];
}

export default function TextSizeRow() {
  const { t } = useTranslation();
  const [showSubmenu, setShowSubmenu] = useState(false);
  const [selectedSize, setSelectedSize] = useState(
    window.localStorage.getItem("missionllm_text_size") || "normal"
  );

  function handleTextSizeChange(size) {
    setSelectedSize(size);
    window.localStorage.setItem("missionllm_text_size", size);
    window.dispatchEvent(new CustomEvent("textSizeChange", { detail: size }));
  }

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
        <span>{t("chat_window.text_size_label")}</span>
        <CaretRight size={14} weight="bold" className="text-ml-text-3" />
      </button>
      {showSubmenu && (
        <TextSizeSubmenu
          selectedSize={selectedSize}
          onSizeChange={handleTextSizeChange}
        />
      )}
    </div>
  );
}

function TextSizeSubmenu({ selectedSize, onSizeChange }) {
  const { t } = useTranslation();
  const textSizes = getTextSizes(t);

  return (
    <div className="absolute right-full top-0 pr-2">
      <div
        role="menu"
        className={`w-[150px] p-1.5 flex flex-col gap-0.5 ${MENU_SURFACE}`}
      >
        {textSizes.map(({ key, label }) => (
          <button
            type="button"
            role="menuitemradio"
            aria-checked={selectedSize === key}
            key={key}
            onClick={() => onSizeChange(key)}
            className={`${MENU_ROW} justify-between ${
              selectedSize === key ? "bg-ml-accent-soft text-ml-text" : ""
            }`}
          >
            <span>{label}</span>
            {selectedSize === key && (
              <Check size={14} weight="bold" className="text-ml-accent-text" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
